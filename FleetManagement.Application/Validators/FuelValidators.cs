using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FluentValidation;

namespace FleetManagement.Application.Validators;

public class CreateFuelCardValidator : AbstractValidator<CreateFuelCardDto>
{
    public CreateFuelCardValidator()
    {
        RuleFor(x => x.CardNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Provider).MaximumLength(100).When(x => x.Provider != null);
        RuleFor(x => x.ValidTo)
            .Must((dto, validTo) => validTo == null || validTo >= dto.ValidFrom)
            .WithMessage(ErrorMessageKeys.ValidatorValidToAfterFrom);
    }
}

public class UpdateFuelCardValidator : AbstractValidator<UpdateFuelCardDto>
{
    public UpdateFuelCardValidator()
    {
        RuleFor(x => x.Provider)
            .MaximumLength(100).When(x => x.Provider != null);

        RuleFor(x => x.ValidTo)
            .Must((dto, validTo) => validTo == null || !dto.ValidFrom.HasValue || validTo >= dto.ValidFrom)
            .WithMessage(ErrorMessageKeys.ValidatorValidToAfterFrom);

        RuleFor(x => x.Notes)
            .MaximumLength(2000).When(x => x.Notes != null);
    }
}

public class CreateFuelTransactionValidator : AbstractValidator<CreateFuelTransactionDto>
{
    public CreateFuelTransactionValidator()
    {
        RuleFor(x => x.VehicleId).GreaterThan(0);
        RuleFor(x => x.FuelTypeId).GreaterThan(0);
        RuleFor(x => x.PostedAt).NotEmpty()
            .LessThanOrEqualTo(DateTime.UtcNow.AddMinutes(5))
            .WithMessage("PostedAt cannot be in the future.");
        RuleFor(x => x.TotalCost).GreaterThan(0);
        RuleFor(x => x.OdometerKm).GreaterThan(0).When(x => x.OdometerKm.HasValue);
        RuleFor(x => x.Liters).GreaterThan(0).When(x => x.Liters.HasValue);
        RuleFor(x => x.EnergyKwh).GreaterThan(0).When(x => x.EnergyKwh.HasValue);

        // Must have either fuel or electric data
        RuleFor(x => x).Must(x =>
            (x.Liters.HasValue && x.PricePerLiter.HasValue) ||
            (x.EnergyKwh.HasValue && x.PricePerKwh.HasValue))
            .WithMessage("Must provide either Liters + PricePerLiter (fuel) or EnergyKwh + PricePerKwh (electric).");
    }
}