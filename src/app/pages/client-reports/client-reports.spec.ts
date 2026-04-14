import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientReports } from './client-reports';

describe('ClientReports', () => {
  let component: ClientReports;
  let fixture: ComponentFixture<ClientReports>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientReports]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientReports);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
