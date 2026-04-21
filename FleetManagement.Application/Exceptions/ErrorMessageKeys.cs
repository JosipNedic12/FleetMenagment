namespace FleetManagement.Application.Exceptions;

public static class ErrorMessageKeys
{
    // ── Vehicle ──────────────────────────────────────────────
    public const string VehicleNotFound                   = "error.vehicle.notFound";
    public const string VehicleDuplicate                  = "error.vehicle.duplicate";

    // ── Driver ───────────────────────────────────────────────
    public const string DriverNotFound                    = "error.driver.notFound";
    public const string DriverLicenseDuplicate            = "error.driver.licenseDuplicate";

    // ── InsurancePolicy ──────────────────────────────────────
    public const string InsurancePolicyNotFound           = "error.insurance.notFound";
    public const string InsurancePolicyNumberDuplicate    = "error.insurance.policyNumberDuplicate";
    public const string InsurancePolicyOverlap            = "error.insurance.overlap";

    // ── RegistrationRecord ───────────────────────────────────
    public const string RegistrationRecordNotFound        = "error.registration.notFound";
    public const string RegistrationNumberDuplicate       = "error.registration.numberDuplicate";
    public const string RegistrationNumberOnVehicle       = "error.registration.numberOnVehicle";
    public const string RegistrationNoCurrentRecord       = "error.registration.noCurrent";
    public const string RegistrationRecordOverlap         = "error.registration.overlap";

    // ── VehicleAssignment ────────────────────────────────────
    public const string VehicleAssignmentActiveConflict   = "error.assignment.activeConflict";

    // ── FuelCard ─────────────────────────────────────────────
    public const string FuelCardNotFound                  = "error.fuelCard.notFound";
    public const string FuelCardNumberDuplicate           = "error.fuelCard.cardNumberDuplicate";

    // ── Validators ───────────────────────────────────────────
    public const string ValidatorLicenseExpiryFuture      = "error.validator.licenseExpiryFuture";
    public const string ValidatorLicenseCategoryRequired  = "error.validator.licenseCategoryRequired";
    public const string ValidatorVinFormat                 = "error.validator.vinFormat";
    public const string ValidatorYearRange                 = "error.validator.yearRange";
    public const string ValidatorStatusInvalid             = "error.validator.statusInvalid";
    public const string ValidatorValidToAfterFrom         = "error.validator.validToAfterFrom";
    public const string ValidatorPremiumPositive          = "error.validator.premiumPositive";
    public const string ValidatorFeeNonNegative           = "error.validator.feeNonNegative";
}
