package me.nicolaferraro.quickstarts.saga.payment;

import org.apache.camel.Exchange;
import org.apache.camel.Processor;
import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.component.kafka.KafkaComponent;
import org.apache.camel.component.kafka.KafkaConstants;
import org.apache.camel.model.SagaPropagation;
import org.apache.camel.model.rest.RestParamType;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.stereotype.Component;

@SpringBootApplication
public class CamelSagaPaymentService {

    public static void main(String[] args) {
        SpringApplication.run(CamelSagaPaymentService.class, args);
    }

    @Component
    static class Routes extends RouteBuilder {
        @Override
        public void configure() throws Exception {

            // setup kafka component with the brokers
            KafkaComponent kafka = new KafkaComponent();
            kafka.setBrokers("my-cluster-kafka-bootstrap.strimzi.svc:9092");
            getContext().addComponent("kafka", kafka);

            rest().post("/pay")
                    .param().type(RestParamType.query).name("type").required(true).endParam()
                    .param().type(RestParamType.header).name("id").required(true).endParam()
                    .route()
                    .saga()
                    .propagation(SagaPropagation.MANDATORY).option("id", header("id")).option("type", header("type")).compensation("direct:cancelPayment")
                    .log("Paying ${header.type} for order #${header.id}")
                    .to("direct:paymentMade");

            from("direct:paymentMade")
                    .process(new Processor() {
                        @Override
                        public void process(Exchange exchange) throws Exception {
                            String id = exchange.getIn().getHeader("id").toString();
                            String type = exchange.getIn().getHeader("type").toString();
                            exchange.getIn().setBody("Payment Booked for " + type + " #" + id);
                            exchange.getIn().setHeader(KafkaConstants.PARTITION_KEY, 0);
                            exchange.getIn().setHeader(KafkaConstants.KEY, id);
                        }
                    })
                    .to("kafka:payments")
                    .choice()
                    .when(x -> Math.random() >= 0.85)
                    .throwException(new RuntimeException("Random failure during payment"))
                    .end();

            from("direct:cancelPayment")
                    .process(new Processor() {
                        @Override
                        public void process(Exchange exchange) throws Exception {
                            String id = exchange.getIn().getHeader("id").toString();
                            String type = exchange.getIn().getHeader("type").toString();
                            exchange.getIn().setBody("Payment Cancelled " + type + " #" + id);
                            exchange.getIn().setHeader(KafkaConstants.PARTITION_KEY, 0);
                            exchange.getIn().setHeader(KafkaConstants.KEY, id);
                        }
                    })
                    .to("kafka:payments")
                    .log("Payment ${header.type} #${header.id} has been cancelled");

        }
    }

}
