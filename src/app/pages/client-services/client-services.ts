import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-client-services',
  templateUrl: './client-services.html',
  styleUrls: ['./client-services.css'],
  imports: [RouterModule, FormsModule, CommonModule, SidebarComponent]
})
export class ClientServices {

  showModal = false;

  servicios: any[] = [];

  formData:any = {
    client_id: '',
    request_date: '',
    request_time: '',
    service_type: 'Correctivo',
    address: ''
  };

  constructor(){

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if(user){
      this.formData.client_id = user.id;
    }

  }

  solicitarServicio(){
    this.showModal = true;
  }

  cerrarModal(){
    this.showModal = false;
  }

  guardarServicio(){

    console.log("Datos enviados:", this.formData);

    fetch("http://localhost:8000/services", {
      method: "POST",
      headers:{
        "Content-Type": "application/json"
      },
      body: JSON.stringify(this.formData)
    })
    .then(res => res.json())
    .then(data => {

      alert("Servicio solicitado correctamente");

      this.showModal = false;

      // limpiar formulario
      this.formData = {
        client_id: this.formData.client_id,
        request_date: '',
        request_time: '',
        service_type: 'Correctivo',
        address: ''
      };

    })
    .catch(error => {

      console.error(error);
      alert("Error al solicitar servicio");

    });

  }

}