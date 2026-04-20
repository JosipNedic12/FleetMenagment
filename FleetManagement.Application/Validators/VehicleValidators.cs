using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FluentValidation;

namespace FleetManagement.Application.Validators;

public class CreateVehicleValidator : AbstractValidator<CreateVehicleDto>
{
    public CreateVehicleValidator()
    {
        RuleFor(x => x.RegistrationNumber)
            .NotEmpty()
            .MaximumLength(20);

        RuleFor(x => x.Vin)
            .NotEmpty()
            .Length(17)
            .Matches(@"^[A-HJ-NPR-Z0-9]{17}$")
            .WithMessage(ErrorMessageKeys.ValidatorVinFormat);

        RuleFor(x => x.MakeId).GreaterThan(0);
        RuleFor(x => x.ModelId).GreaterThan(0);
        RuleFor(x => x.CategoryId).GreaterThan(0);
        RuleFor(x => x.FuelTypeId).GreaterThan(0);

        RuleFor(x => x.Year)
            .InclusiveBetween((short)1900, (short)(DateTime.Today.Year + 1))
            .WithMessage(ErrorMessageKeys.ValidatorYearRange);

        RuleFor(x => x.Color)
            .MaximumLength(50).When(x => x.Color != null);

        RuleFor(x => x.Notes)
            .MaximumLength(1000).When(x => x.Notes != null);
    }
}

public class UpdateVehicleValidator : AbstractValidator<UpdateVehicleDto>
{
    private static readonly string[] ValidStatuses = ["active", "service", "retired", "sold"];

    public UpdateVehicleValidator()
    {
        RuleFor(x => x.Status)
            .Must(s => s == null || ValidStatuses.Contains(s))
            .WithMessage(ErrorMessageKeys.ValidatorStatusInvalid);

        RuleFor(x => x.Color)
            .MaximumLength(50).When(x => x.Color != null);

        RuleFor(x => x.Notes)
            .MaximumLength(1000).When(x => x.Notes != null);
    }
}
