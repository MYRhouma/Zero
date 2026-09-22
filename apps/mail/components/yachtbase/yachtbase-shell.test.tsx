import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { YachtbaseShell } from './yachtbase-shell';

void React;

describe('YachtbaseShell', () => {
  it('renders Yachtbase navigation around email', () => {
    const markup = renderToStaticMarkup(
      <YachtbaseShell>
        <div data-testid="email-child">Email workspace</div>
      </YachtbaseShell>,
    );

    expect(markup).toContain('href="/dashboard"');
    expect(markup).toContain('Yachtbase');
    expect(markup).toContain('href="/dashboard/email"');
    expect(markup).toContain('aria-label="Email workspace"');
    expect(markup).toContain('data-testid="email-child"');
    expect(markup).not.toContain('href="/mail/inbox"');
  });
});
