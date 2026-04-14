import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarComponent } from './sidebar';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show reports for technician role', () => {
    localStorage.setItem('userRole', 'tecnico');
    component.ngOnInit();

    expect(component.navItems.some((item) => item.route === '/technician-reports')).toBeTrue();
  });
});
