import { TestBed } from '@angular/core/testing';

import { LcService } from './lc.service';

describe('LcService', () => {
  let service: LcService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LcService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
