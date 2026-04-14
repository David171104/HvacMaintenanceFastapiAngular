import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechniccianServices } from './techniccian-services';

describe('TechniccianServices', () => {
  let component: TechniccianServices;
  let fixture: ComponentFixture<TechniccianServices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechniccianServices]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TechniccianServices);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
