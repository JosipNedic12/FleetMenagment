using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FluentValidation;

namespace FleetManagement.Application.Validators;

public class CreateDriverValidator : AbstractValidator<CreateDriverDto>
{
    public CreateDriverValidator()
    {
        RuleFor(x => x.EmployeeId).GreaterThan(0);
        RuleFor(x => x.LicenseNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.LicenseExpiry)
            .Must(date => date > DateOnly.FromDateTime(DateTime.Today))
            .WithMessage(ErrorMessageKeys.ValidatorLicenseExpiryFuture);
        RuleFor(x => x.LicenseCategoryIds)
            .NotEmpty().WithMessage(ErrorMessageKeys.ValidatorLicenseCategoryRequired);
    }
}

public class UpdateDriverValidator : AbstractValidator<UpdateDriverDto>
{
    public UpdateDriverValidator()
    {
        RuleFor(x => x.LicenseNumber)
            .NotEmpty().MaximumLength(50)
            .When(x => x.LicenseNumber != null);

        RuleFor(x => x.LicenseExpiry)
            .Must(date => !date.HasValue || date.Value > DateOnly.FromDateTime(DateTime.Today))
            .WithMessage(ErrorMessageKeys.ValidatorLicenseExpiryFuture)
            .When(x => x.LicenseExpiry.HasValue && x.LicenseExpiry != default);
    }
}
