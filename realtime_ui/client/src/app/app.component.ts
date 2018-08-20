import { Component, OnInit, OnDestroy, ViewChild,ViewEncapsulation } from '@angular/core';
import { AppService } from './app.service';
import { Subscription } from 'rxjs/Subscription';

@Component({
    encapsulation: ViewEncapsulation.None,
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {

    title = 'Project';
    pay: number;
    flight: number;
    train: number;
    sub: Subscription;
    columns: number;
    rows: number;
    selectedTicker: string;

    constructor(private dataService: AppService) { }

    ngOnInit() {
        this.sub = this.dataService.getPay().subscribe(p => {
                this.pay = p;
                console.log(this.pay);
            })
            this.dataService.getFlight().subscribe(f => {
                this.flight = f;
                console.log(this.flight);
            })
            this.dataService.getTrain().subscribe(t => {
                this.train = t;
                console.log(this.train);
            })
    }
    ngOnDestroy() {
        this.sub.unsubscribe();
    }

}
