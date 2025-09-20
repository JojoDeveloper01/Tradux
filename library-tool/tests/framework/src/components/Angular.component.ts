import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { tStore, setLanguage, getCurrentLanguage, getAvailableLanguages } from "tradux";

@Component({
    selector: 'app-tradux',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div>
        <h1>Angular</h1>
        <h2>{{ t.welcome }}</h2>
        <p>{{ t.navigation?.home }}</p>
        <p>{{ t.navigation?.about }}</p>
        <p>{{ t.navigation?.services }}</p>

        <select [value]="currentLanguage" (change)="changeLanguage($event)">
            <option *ngFor="let lang of availableLanguages" [value]="lang">
                {{ lang.toUpperCase() }}
            </option>
        </select>
    </div>
  `,
    host: { 'data-component': 'tradux' },
})
class TraduxComponent {
    t: any = {};
    currentLanguage = '';
    availableLanguages: string[] = [];

    constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone) {
        this.initComponent().catch(console.error);
    }

    async initComponent() {
        // Load initial data
        this.availableLanguages = await getAvailableLanguages();
        this.currentLanguage = getCurrentLanguage();

        // Subscribe to translation changes
        tStore.subscribe((translations: any) => {
            this.ngZone.run(() => {
                this.t = { ...translations };
                this.cdr.detectChanges();
            });
        });
    }

    async changeLanguage(event: Event) {
        const target = event.target as HTMLSelectElement;
        this.cdr.detectChanges();

        try {
            await setLanguage(target.value);
            this.currentLanguage = getCurrentLanguage();
        } finally {
            this.cdr.detectChanges();
        }
    }
}

export default TraduxComponent as any;