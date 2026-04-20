using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FluentValidation;

namespace FleetManagement.Application.Validators;

public class CreateInsurancePolicyValidator : AbstractValidator<CreateInsurancePolicyDto>
{
    public CreateInsurancePolicyValidator()
    {
        RuleFor(x => x.VehicleId).GreaterThan(0);

        RuleFor(x => x.PolicyNumber)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.Insurer)
            .NotEmpty()
            .MaximumLength(150);

        RuleFor(x => x.ValidFrom).NotEmpty();
        RuleFor(x => x.ValidTo).NotEmpty();

        RuleFor(x => x.ValidTo)
            .GreaterThan(x => x.ValidFrom)
            .WithMessage(ErrorMessageKeys.ValidatorValidToAfterFrom);

        RuleFor(x => x.Premium)
            .GreaterThan(0)
            .WithMessage(ErrorMessageKeys.ValidatorPremiumPositive);

        RuleFor(x => x.CoverageNotes)
            .MaximumLength(2000).When(x => x.CoverageNotes != null);
    }
}

public class UpdateInsurancePolicyValidator : AbstractValidator<UpdateInsurancePolicyDto>
{
    public UpdateInsurancePolicyValidator()
    {
        RuleFor(x => x.Insurer)
            .NotEmpty().MaximumLength(150)
            .When(x => x.Insurer != null);

        RuleFor(x => x.Premium)
            .GreaterThan(0).WithMessage(ErrorMessageKeys.ValidatorPremiumPositive)
            .When(x => x.Premium.HasValue);

        RuleFor(x => x.CoverageNotes)
            .MaximumLength(2000).When(x => x.CoverageNotes != null);

        RuleFor(x => x)
            .Must(x => !x.ValidFrom.HasValue || !x.ValidTo.HasValue || x.ValidTo.Value > x.ValidFrom.Value)
            .WithMessage(ErrorMessageKeys.ValidatorValidToAfterFrom)
            .When(x => x.ValidFrom.HasValue && x.ValidTo.HasValue);
    }
}
