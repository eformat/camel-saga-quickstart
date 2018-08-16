package me.nicolaferraro.quickstarts.saga.flight;

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
public class CamelSagaFlightService {

    public static void main(String[] args) {
        SpringApplication.run(CamelSagaFlightService.class, args);
    }

    @Component
    static class Routes extends RouteBuilder {
        @Override
        public void configure() throws Exception {

            // setup kafka component with the brokers
            KafkaComponent kafka = new KafkaComponent();
            kafka.setBrokers("my-cluster-kafka-bootstrap.strimzi.svc:9092");
            getContext().addComponent("kafka", kafka);

            rest().post("/flight/buy")
                    .param().type(RestParamType.header).name("id").required(true).endParam()
                    .route()
                    .saga()
                    .propagation(SagaPropagation.MANDATORY).option("id", header("id")).compensation("direct:cancelPurchase")
                    .log("Buying flight #${header.id}")
                    .to("direct:kafkaBooked")
                    .to("http4://camel-saga-payment-service:8080/api/pay?bridgeEndpoint=true&type=flight")
                    .log("Payment for flight #${header.id} done");

            from("direct:kafkaBooked")
                    .process(new Processor() {
                        @Override
                        public void process(Exchange exchange) throws Exception {
                            String id = exchange.getIn().getHeader("id").toString();
                            exchange.getIn().setBody("Flight Booked #"+id);
                            exchange.getIn().setHeader(KafkaConstants.PARTITION_KEY, 0);
                            exchange.getIn().setHeader(KafkaConstants.KEY, id);
                        }
                    }).to("kafka:flights");

            from("direct:cancelPurchase")
                    .process(new Processor() {
                        @Override
                        public void process(Exchange exchange) throws Exception {
                            String id = exchange.getIn().getHeader("id").toString();
                            exchange.getIn().setBody("Flight Cancelled #"+id);
                            exchange.getIn().setHeader(KafkaConstants.PARTITION_KEY, 0);
                            exchange.getIn().setHeader(KafkaConstants.KEY, id);
                        }
                    })
                    .to("kafka:flights")
                    .log("Flight purchase #${header.id} has been cancelled");
        }
    }

}
