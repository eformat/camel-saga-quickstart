'use strict';
let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);
var Kafka = require('no-kafka');

io.on('connection', (socket) => {
  console.log('CLIENT CONNECTED');

  socket.on('disconnect', function(){
    console.log('CLIENT DISCONNECTED');
  });
});

http.listen(8080, () => {
    console.log('started on port 8080');

    var consumer;

    // openshift, else can use nodeport locally
    if(process.env.UI_SERVER_PORT_8080_TCP_PROTO) {
        var cs = process.env.KAFKA_URL || 'my-cluster-kafka-0.my-cluster-kafka-brokers.strimzi.svc.cluster.local:9092,my-cluster-kafka-1.my-cluster-kafka-brokers.strimzi.svc.cluster.local:9092,my-cluster-kafka-2.my-cluster-kafka-brokers.strimzi.svc.cluster.local:9092';
        consumer = new Kafka.SimpleConsumer({
            connectionString: cs,
		    clientId: 'no-kafka-client'
        });
    } else {
        consumer = new Kafka.SimpleConsumer({
            connectionString: 'localhost:30090,localhost:30091,localhost:30092',
		    clientId: 'no-kafka-client',
		    brokerRedirection: {
			    'my-cluster-kafka-0.my-cluster-kafka-brokers.strimzi.svc.cluster.local:9092': 'localhost:30090',
			    'my-cluster-kafka-1.my-cluster-kafka-brokers.strimzi.svc.cluster.local:9092': 'localhost:30091',
			    'my-cluster-kafka-2.my-cluster-kafka-brokers.strimzi.svc.cluster.local:9092': 'localhost:30092'
	    	}
        });
    }

    // cache all display data here - should add paging in here
    var all_pay = [];
    var cnt_pay = 0;
    var all_flight = [];
    var cnt_flight = 0;
    var all_train = [];
    var cnt_train = 0;

	var dataHandler = function (messageSet, topic, partition) {

		messageSet.forEach(function (m) {
			//console.log(topic, partition, m.offset, m.message.key.toString('utf8'), m.message.value.toString('utf8'));

            var m_key = m.message.key.toString('utf8');
            var m_value = m.message.value.toString('utf8');

			if(topic == "payments") {
                // payment_flight
                var pay_flight = /Payment Booked for flight/g;
                var pay_flight_result = pay_flight.test(m_value);
                // payment_train
                var pay_train = /Payment Booked for train/g;
                var pay_train_result = pay_train.test(m_value);

                // Cancellations
                // payment_flight
                var cancel_pay_flight = /Payment Cancelled flight/g;
                var cancel_pay_flight_result = cancel_pay_flight.test(m_value);
                // payment_train
                var cancel_pay_train = /Payment Cancelled train/g;
                var cancel_pay_train_result = cancel_pay_train.test(m_value);

			    all_pay[cnt_pay] = { id: m_key, pf: ((pay_flight_result || cancel_pay_flight_result) ? m_value: undefined), pt: ((pay_train_result || cancel_pay_train_result) ? m_value: undefined) }
				io.emit('pay_data', { data: all_pay });
				cnt_pay++;
			}
			if(topic == "flights") {
                // Bookings
    	        // flight booking
                var book_flight = /Flight Booked/g;
                var book_flight_result = book_flight.test(m_value);

                // Cancellations
                var cancel_flight = /Flight Cancelled/g;
                var cancel_flight_result = cancel_flight.test(m_value);

			    all_flight[cnt_flight] = { id: m_key, bf: ((book_flight_result || cancel_flight_result) ? m_value: undefined) }
				io.emit('flight_data', { data: all_flight });
				cnt_flight++;
			}
            if(topic == "trains") {
                // Bookings
                // train booking
                var book_train = /Train Booked/g;
                var book_train_result = book_train.test(m_value);

                // Cancellations
                var cancel_train = /Train Cancelled/g;
                var cancel_train_result = cancel_train.test(m_value);

			    all_train[cnt_train] = { id: m_key, bt: ((book_train_result || cancel_train_result) ? m_value: undefined) }
				io.emit('train_data', { data: all_train });
				cnt_train++;
			}
		});
	};

    return consumer.init().then(function () {
        // Subscribe single partiton 0 in a topic. Add an array of partitions if required e.g. [0,1])
    	var v1 = consumer.subscribe('payments', 0, dataHandler);
    	var v2 = consumer.subscribe('flights', 0, dataHandler);
    	var v3 = consumer.subscribe('trains', 0, dataHandler);
    	var arr = [];
    	arr.push([v1,v2,v3]);
    	return arr;
    });

});

    // Topic Trips (from Stream Join)
    // data handler function can return a Promise
    /*
	var dataHandler = function (messageSet, topic, partition) {
	    var current = {};

		messageSet.forEach(function (m) {
			//console.log(topic, partition, m.offset, m.message.key.toString('utf8'), m.message.value.toString('utf8'));

            var m_key = m.message.key.toString('utf8');
            var m_value = m.message.value.toString('utf8');

            // Bookings
	        // flight booking
            var book_flight = /Flight Booked/g;
            var book_flight_result = book_flight.test(m_value);
            // train booking
            var book_train = /Train Booked/g;
            var book_train_result = book_train.test(m_value);
            // payment_flight
            var pay_flight = /Payment Booked for flight/g;
            var pay_flight_result = pay_flight.test(m_value);
            // payment_train
            var pay_train = /Payment Booked for train/g;
            var pay_train_result = pay_train.test(m_value);

            // Cancellations
            var cancel_flight = /Flight Cancelled/g;
            var cancel_flight_result = cancel_flight.test(m_value);
            // train booking
            var cancel_train = /Train Cancelled/g;
            var cancel_train_result = cancel_train.test(m_value);
            // payment_flight
            var cancel_pay_flight = /Payment Cancelled flight/g;
            var cancel_pay_flight_result = cancel_pay_flight.test(m_value);
            // payment_train
            var cancel_pay_train = /Payment Cancelled train/g;
            var cancel_pay_train_result = cancel_pay_train.test(m_value);

            // trip status
            if (current[m_key] === undefined) {
                 current[m_key] = { id: m_key, bf: book_flight_result ? true:undefined, pf: pay_flight_result ? true:undefined, bt: book_train_result ? true:undefined, pt: pay_train_result ? true:undefined };
            } else {
                 current[m_key]['bf'] = (cancel_flight_result ? false: (current[m_key]['bf'] != undefined ? current[m_key]['bf']: book_flight_result ? true:undefined));
                 current[m_key]['bt'] = (cancel_train_result ? false: (current[m_key]['bt'] != undefined ? current[m_key]['bt']: book_train_result ? true:undefined));
                 current[m_key]['pf'] = (cancel_pay_flight_result ? false: (current[m_key]['pf'] != undefined ? current[m_key]['pf']: pay_flight_result ? true:undefined));
                 current[m_key]['pt'] = (cancel_pay_train_result ? false: (current[m_key]['pt'] != undefined ? current[m_key]['pt']: pay_train_result ? true:undefined));
            }

            console.log(current[m_key]);

			if(topic == "trips") {
			    alldata[m_key - 1] = current[m_key];
			    //alldata.push(current[m_key]);
				io.emit('data', { data: alldata });
			}
		});
	};

	return consumer.init().then(function () {
		// Subscribe partitons 0 and 1 in a topic:
		var v1 = consumer.subscribe('trips', 0, dataHandler);
		return v1;
	});

	*/
