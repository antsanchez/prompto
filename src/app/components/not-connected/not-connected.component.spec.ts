import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotConnectedComponent } from './not-connected.component';

describe('NotConnectedComponent', () => {
  let component: NotConnectedComponent;
  let fixture: ComponentFixture<NotConnectedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotConnectedComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NotConnectedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
