import { CommonModule } from '@angular/common';
import { Component, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { BadgeComponent } from '../../ui/badge/badge';
import { CardComponent } from '../../ui/card/card';
import { SectionHeaderComponent } from '../../ui/section-header/section-header';

@Component({
  selector: 'app-analitica',
  standalone: true,
  imports: [CommonModule, CardComponent, BadgeComponent, SectionHeaderComponent],
  templateUrl: './analitica.html',
  styleUrl: './analitica.css',
})
export class AnaliticaComponent {
  readonly powerBiEmbedUrl = 'https://app.powerbi.com/view?r=eyJrIjoiZTBiZWFlOGQtMGQyZi00ZGY0LTlhYTktZDI2NTkzNTI1MzIxIiwidCI6IjFlOWFhYmU4LTY3ZjgtNGYxYy1hMzI5LWE3NTRlOTI0OTlhZSIsImMiOjR9';

  constructor(private readonly sanitizer: DomSanitizer) { }

  get hasEmbedUrl(): boolean {
    return this.powerBiEmbedUrl.trim().length > 0;
  }

  get safeEmbedUrl(): SafeResourceUrl | null {
    if (!this.hasEmbedUrl) {
      return null;
    }

    const cleanUrl = this.sanitizer.sanitize(SecurityContext.URL, this.powerBiEmbedUrl) ?? '';
    return cleanUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(cleanUrl)
      : null;
  }
}
