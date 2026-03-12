import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientServices } from './client-services';

describe('ClientServices', () => {
  let component: ClientServices;
  let fixture: ComponentFixture<ClientServices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientServices]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientServices);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
