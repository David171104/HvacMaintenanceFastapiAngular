import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LecturasService } from './lecturas.service';

describe('Lecturas', () => {
  let component: LecturasService;
  let fixture: ComponentFixture<LecturasService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LecturasService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LecturasService);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
