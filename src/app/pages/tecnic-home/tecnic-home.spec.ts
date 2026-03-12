import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TecnicHome } from './tecnic-home';

describe('TecnicHome', () => {
  let component: TecnicHome;
  let fixture: ComponentFixture<TecnicHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TecnicHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TecnicHome);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
