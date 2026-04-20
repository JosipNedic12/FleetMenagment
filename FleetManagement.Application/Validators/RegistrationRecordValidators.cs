using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FluentValidation;

namespace FleetManagement.Application.Validators;

public class CreateRegistrationRecordValidator : AbstractValidator<CreateRegistrationRecordDto>
{
    public CreateRegistrationRecordValidator()
    {
        RuleFor(x => x.VehicleId).GreaterThan(0);

        RuleFor(x => x.RegistrationNumber)
            .NotEmpty()
            .MaximumLength(20);

        RuleFor(x => x.ValidFrom).NotEmpty();
        RuleFor(x => x.ValidTo).NotEmpty();

        RuleFor(x => x.ValidTo)
            .GreaterThan(x => x.ValidFrom)
            .WithMessage(ErrorMessageKeys.ValidatorValidToAfterFrom);

        RuleFor(x => x.Fee)
            .GreaterThanOrEqualTo(0).WithMessage(ErrorMessageKeys.ValidatorFeeNonNegative)
            .When(x => x.Fee.HasValue);

        RuleFor(x => x.Notes)
            .MaximumLength(2000).When(x => x.Notes != null);
    }
}

public class UpdateRegistrationRecordValidator : AbstractValidator<UpdateRegistrationRecordDto>
{
    public UpdateRegistrationRecordValidator()
    {
        RuleFor(x => x.RegistrationNumber)
            .NotEmpty().MaximumLength(20)
            .When(x => x.RegistrationNumber != null);

        RuleFor(x => x.Fee)
            .GreaterThanOrEqualTo(0).WithMessage(ErrorMessageKeys.ValidatorFeeNonNegative)
            .When(x => x.Fee.HasValue);

        RuleFor(x => x.Notes)
            .MaximumLength(2000).When(x => x.Notes != null);

        RuleFor(x => x)
            .Must(x => !x.ValidFrom.HasValue || !x.ValidTo.HasValue || x.ValidTo.Value > x.ValidFrom.Value)
            .WithMessage(ErrorMessageKeys.ValidatorValidToAfterFrom)
            .When(x => x.ValidFrom.HasValue && x.ValidTo.HasValue);
    }
}
