import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { settle, startLoading } from '../../core/testing';
import { InsightsCard } from './insights-card';

describe('InsightsCard', () => {
  it('loads insights only when asked', async () => {
    TestBed.configureTestingModule({
      imports: [InsightsCard],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(InsightsCard);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    http.expectNone('/api/ai/insights');

    element.querySelector('button')!.click();
    await startLoading();
    http
      .expectOne((r) => r.url === '/api/ai/insights')
      .flush({
        from: '',
        to: '',
        insights: ['هزینه‌ی خوراک بالا رفته است.'],
        generatedByAi: false,
      });
    await settle(fixture);

    expect(element.textContent).toContain('هزینه‌ی خوراک بالا رفته است.');
  });
});
