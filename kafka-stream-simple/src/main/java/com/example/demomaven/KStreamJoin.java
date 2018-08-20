package com.example.demomaven;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.KafkaStreams;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.streams.kstream.*;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.Properties;
import java.util.concurrent.TimeUnit;

@SpringBootApplication
public class KStreamJoin {

    final static String bootstrapServers = "my-cluster-kafka-bootstrap.strimzi.svc:9092";
    final static String trainsTopic = "trains";
    final static String flightsTopic = "flights";
    final static String paymentsTopic = "payments";
    final static String outputTopic = "trips";

    public static void main(String[] args) {
        SpringApplication.run(KStreamJoin.class, args);

        final Properties streamsConfiguration = new Properties();
        streamsConfiguration.put(StreamsConfig.APPLICATION_ID_CONFIG, "kafka-stream-join");
        streamsConfiguration.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        streamsConfiguration.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass().getName());
        streamsConfiguration.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().getClass().getName());
        streamsConfiguration.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, 1000);
        // Use a temporary directory for storing state, which will be automatically removed after the test.
        streamsConfiguration.put(StreamsConfig.STATE_DIR_CONFIG, "/tmp");
        // Read the topic from the very beginning if no previous consumer offsets are found for this app.
        // Resetting an app will set any existing consumer offsets to zero,
        // so setting this config combined with resetting will cause the application to re-process all the input data in the topic.
        streamsConfiguration.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        final KafkaStreams streams = run(args, streamsConfiguration);

        // Add shutdown hook to respond to SIGTERM and gracefully close Kafka Streams
        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));
    }

    public static KafkaStreams run(final String[] args, final Properties streamsConfiguration) {
        // Construct a `KStream` from the input topic, where message values
        // represent lines of text (for the sake of this example, we ignore whatever may be stored
        // in the message keys)
        final StreamsBuilder builder = new StreamsBuilder();
        KStream<String, String> trains = builder.stream(trainsTopic);
        KStream<String, String> flights = builder.stream(flightsTopic);
        KStream<String, String> payment = builder.stream(paymentsTopic);

        // Sliding Window Joins
        KStream<String, String> ftjoin = trains.leftJoin(
                flights,
                (leftValue, rightValue) -> "left=" + leftValue + ", right=" + rightValue, /* ValueJoiner */
                JoinWindows.of(TimeUnit.MINUTES.toMillis(5)),
                Joined.with(Serdes.String(),/* key */ Serdes.String(),/* left value */ Serdes.String()/* right value */));

        KStream<String, String> payjoin = payment.join(
                ftjoin, // flights and trains join
                (leftValue, rightValue) -> "left=" + leftValue + ", right=" + rightValue, /* ValueJoiner */
                JoinWindows.of(TimeUnit.MINUTES.toMillis(5)),
                Joined.with(Serdes.String(),/* key */ Serdes.String(),/* left value */ Serdes.String()/* right value */));

        // Output to sysout
        payjoin.print(Printed.toSysOut());

        // Save in Kafka topic
        payjoin.to(outputTopic, Produced.with(Serdes.String(), Serdes.String()));

        final KafkaStreams streams = new KafkaStreams(builder.build(), streamsConfiguration);
        streams.start();
        return streams;
    }

}
