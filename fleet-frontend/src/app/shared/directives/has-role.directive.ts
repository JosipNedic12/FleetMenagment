import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { UserRole } from '../../core/models/models';

@Directive({
  selector: '[hasRole]',
  standalone: true
})
export class HasRoleDirective {
  @Input('hasRole') roles: UserRole | UserRole[] = [];

  private templateRef = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private auth = inject(AuthService);
  private hasView = false;

  constructor() {
    effect(() => {
      const allowed = Array.isArray(this.roles) ? this.roles : [this.roles];
      const show = this.auth.hasRole(...allowed);
      if (show && !this.hasView) {
        this.vcr.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!show && this.hasView) {
        this.vcr.clear();
        this.hasView = false;
      }
    });
  }
}
