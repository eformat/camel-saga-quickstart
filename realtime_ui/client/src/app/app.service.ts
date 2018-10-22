import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { map, catchError } from 'rxjs/operators';
import * as io from 'socket.io-client';
import { Socket } from './interfaces';

@Injectable()
export class AppService {

    socket: Socket;
    payobserver: Observer<any>;
    flightobserver: Observer<any>;
    trainobserver: Observer<any>;

    getPay(): Observable<any> {
        this.socket = io('http://ui-server.saga.svc:8080');
        this.socket.on('pay_data', (res) => {
            this.payobserver.next(res.data);
        });
        return new Observable<any>(observer => {
            this.payobserver = observer;
        });
    }

    getFlight(): Observable<any> {
        this.socket = io('http://ui-server.saga.svc:8080');
        this.socket.on('flight_data', (res) => {
            this.flightobserver.next(res.data);
        });
        return new Observable<any>(observer => {
            this.flightobserver = observer;
        });
    }

    getTrain(): Observable<any> {
        this.socket = io('http://ui-server.saga.svc:8080');
        this.socket.on('train_data', (res) => {
            this.trainobserver.next(res.data);
        });
        return new Observable<any>(observer => {
            this.trainobserver = observer;
        });
    }

    private handleError(error) {
        console.error('server error:', error);
        if (error.error instanceof Error) {
            let errMessage = error.error.message;
            return Observable.throw(errMessage);
        }
        return Observable.throw(error || 'Socket.io server error');
    }

}
