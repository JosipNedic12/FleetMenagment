import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TranslateService {

  // ── Dashboard Stat Cards ──────────────────────────────────
  readonly vehicles          = $localize`:@@dashboard.stat.vehicles:Vehicles`;
  readonly openOrders        = $localize`:@@dashboard.stat.openOrders:Open Orders`;
  readonly kmThisMonth       = $localize`:@@dashboard.stat.kmThisMonth:KM This Month`;
  readonly expiredInsurance  = $localize`:@@dashboard.stat.expiredInsurance:Expired Insurance`;
  readonly inspectionsDue    = $localize`:@@dashboard.stat.inspectionsDue:Inspections Due`;
  readonly fines             = $localize`:@@dashboard.stat.fines:Fines`;
  readonly accidents         = $localize`:@@dashboard.stat.accidents:Accidents`;
  readonly fuelCostThisMonth = $localize`:@@dashboard.stat.fuelCostThisMonth:Fuel Cost This Month`;

  // ── Stat Card Sub-labels ──────────────────────────────────
  readonly subMaintenanceInProgress = $localize`:@@dashboard.stat.subMaintenanceInProgress:Maintenance in progress`;
  readonly subFromOdometerLogs      = $localize`:@@dashboard.stat.subFromOdometerLogs:From odometer logs`;
  readonly subPoliciesExpired       = $localize`:@@dashboard.stat.subPoliciesExpired:Policies expired`;
  readonly subWithin30Days          = $localize`:@@dashboard.stat.subWithin30Days:Within 30 days`;
  readonly subUnpaidFines           = $localize`:@@dashboard.stat.subUnpaidFines:Unpaid fines`;
  readonly subReportedIncidents     = $localize`:@@dashboard.stat.subReportedIncidents:Reported incidents`;
  readonly subEurSpentOnFuel        = $localize`:@@dashboard.stat.subEurSpentOnFuel:EUR spent on fuel`;

  activeCount(n: number): string {
    return $localize`:@@dashboard.stat.subActive:${n}:count: active`;
  }

  // ── Chart Dataset Labels ──────────────────────────────────
  readonly fuelCostEur        = $localize`:@@dashboard.chart.fuelCostEur:Fuel Cost (EUR)`;
  readonly maintenanceCostEur = $localize`:@@dashboard.chart.maintenanceCostEur:Maintenance Cost (EUR)`;
  readonly chartAccidents     = $localize`:@@dashboard.chart.accidents:Accidents`;
  readonly chartFines         = $localize`:@@dashboard.chart.fines:Fines`;

  // ── Doughnut Status Labels ────────────────────────────────
  readonly statusActive    = $localize`:@@dashboard.chart.statusActive:Active`;
  readonly statusInService = $localize`:@@dashboard.chart.statusInService:In Service`;
  readonly statusRetired   = $localize`:@@dashboard.chart.statusRetired:Retired`;
  readonly statusSold      = $localize`:@@dashboard.chart.statusSold:Sold`;

  get vehicleStatusLabels(): string[] {
    return [this.statusActive, this.statusInService, this.statusRetired, this.statusSold];
  }

  // ── Month Abbreviations ───────────────────────────────────
  readonly monthJan = $localize`:@@dashboard.month.jan:Jan`;
  readonly monthFeb = $localize`:@@dashboard.month.feb:Feb`;
  readonly monthMar = $localize`:@@dashboard.month.mar:Mar`;
  readonly monthApr = $localize`:@@dashboard.month.apr:Apr`;
  readonly monthMay = $localize`:@@dashboard.month.may:May`;
  readonly monthJun = $localize`:@@dashboard.month.jun:Jun`;
  readonly monthJul = $localize`:@@dashboard.month.jul:Jul`;
  readonly monthAug = $localize`:@@dashboard.month.aug:Aug`;
  readonly monthSep = $localize`:@@dashboard.month.sep:Sep`;
  readonly monthOct = $localize`:@@dashboard.month.oct:Oct`;
  readonly monthNov = $localize`:@@dashboard.month.nov:Nov`;
  readonly monthDec = $localize`:@@dashboard.month.dec:Dec`;

  get months(): string[] {
    return [
      this.monthJan, this.monthFeb, this.monthMar, this.monthApr,
      this.monthMay, this.monthJun, this.monthJul, this.monthAug,
      this.monthSep, this.monthOct, this.monthNov, this.monthDec,
    ];
  }

  // ── Tooltip ───────────────────────────────────────────────
  readonly currencySuffix = $localize`:@@dashboard.tooltip.currencySuffix:EUR`;
}
