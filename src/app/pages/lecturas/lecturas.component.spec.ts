import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LecturasComponent } from './lecturas.component';

describe('LecturasComponent', () => {
  let component: LecturasComponent;
  let fixture: ComponentFixture<LecturasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LecturasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LecturasComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
