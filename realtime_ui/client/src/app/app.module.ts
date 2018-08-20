import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppService } from './app.service';
import { AppComponent } from './app.component';

import { IgxGridModule } from 'igniteui-angular';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    IgxGridModule.forRoot(),
  ],
  providers: [AppService],
  bootstrap: [AppComponent]
})
export class AppModule { }

