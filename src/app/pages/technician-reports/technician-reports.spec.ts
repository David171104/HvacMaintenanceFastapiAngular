import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechnicianReports } from './technician-reports';

describe('TechnicianReports', () => {
  let component: TechnicianReports;
  let fixture: ComponentFixture<TechnicianReports>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechnicianReports]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TechnicianReports);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
