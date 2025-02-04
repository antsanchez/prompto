import { TestBed } from '@angular/core/testing';

import { DiscussionService } from './discussion.service';

describe('DiscussionService', () => {
  let service: DiscussionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiscussionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
