using FleetManagement.Application.Exceptions;

namespace FleetManagement.API.Localization;

public static class ErrorMessages
{
    private static readonly Dictionary<string, Dictionary<string, string>> _messages = new()
    {
        [ErrorMessageKeys.VehicleNotFound] = new()
        {
            ["en"] = "Vehicle not found.",
            ["hr"] = "Vozilo nije pronađeno."
        },
        [ErrorMessageKeys.VehicleDuplicate] = new()
        {
            ["en"] = "A vehicle with this registration number or VIN already exists.",
            ["hr"] = "Vozilo s ovom registarskom oznakom ili VIN brojem već postoji."
        },

        [ErrorMessageKeys.DriverNotFound] = new()
        {
            ["en"] = "Driver not found.",
            ["hr"] = "Vozač nije pronađen."
        },
        [ErrorMessageKeys.DriverLicenseDuplicate] = new()
        {
            ["en"] = "A driver with this license number already exists.",
            ["hr"] = "Vozač s ovim brojem vozačke dozvole već postoji."
        },

        [ErrorMessageKeys.InsurancePolicyNotFound] = new()
        {
            ["en"] = "Insurance policy not found.",
            ["hr"] = "Polica osiguranja nije pronađena."
        },
        [ErrorMessageKeys.InsurancePolicyNumberDuplicate] = new()
        {
            ["en"] = "An insurance policy with this policy number already exists.",
            ["hr"] = "Polica osiguranja s ovim brojem police već postoji."
        },
        [ErrorMessageKeys.InsurancePolicyOverlap] = new()
        {
            ["en"] = "This vehicle already has an overlapping insurance policy for the specified period.",
            ["hr"] = "Ovo vozilo već ima aktivnu policu osiguranja koja se preklapa s navedenim razdobljem."
        },

        [ErrorMessageKeys.RegistrationRecordNotFound] = new()
        {
            ["en"] = "Registration record not found.",
            ["hr"] = "Zapis o registraciji nije pronađen."
        },
        [ErrorMessageKeys.RegistrationNumberDuplicate] = new()
        {
            ["en"] = "A registration record with this registration number already exists.",
            ["hr"] = "Zapis o registraciji s ovim brojem registracije već postoji."
        },
        [ErrorMessageKeys.RegistrationNumberOnVehicle] = new()
        {
            ["en"] = "This registration number is already assigned to a vehicle.",
            ["hr"] = "Ovaj broj registracije već je dodijeljen vozilu."
        },
        [ErrorMessageKeys.RegistrationNoCurrentRecord] = new()
        {
            ["en"] = "No current registration record found for this vehicle.",
            ["hr"] = "Nije pronađen aktivni zapis o registraciji za ovo vozilo."
        },
        [ErrorMessageKeys.RegistrationRecordOverlap] = new()
        {
            ["en"] = "This vehicle already has an overlapping active registration for the specified period.",
            ["hr"] = "Ovo vozilo već ima aktivnu registraciju koja se preklapa s navedenim razdobljem."
        },

        [ErrorMessageKeys.VehicleAssignmentActiveConflict] = new()
        {
            ["en"] = "This vehicle already has an active assignment. End it before creating a new one.",
            ["hr"] = "Ovo vozilo već ima aktivnu dodjelu. Završite je prije kreiranja nove."
        },

        [ErrorMessageKeys.FuelCardNotFound] = new()
        {
            ["en"] = "Fuel card not found.",
            ["hr"] = "Gorivna kartica nije pronađena."
        },
        [ErrorMessageKeys.FuelCardNumberDuplicate] = new()
        {
            ["en"] = "A fuel card with this card number already exists.",
            ["hr"] = "Gorivna kartica s ovim brojem kartice već postoji."
        },

        [ErrorMessageKeys.ValidatorLicenseExpiryFuture] = new()
        {
            ["en"] = "License expiry must be a future date.",
            ["hr"] = "Datum isteka vozačke dozvole mora biti u budućnosti."
        },
        [ErrorMessageKeys.ValidatorLicenseCategoryRequired] = new()
        {
            ["en"] = "At least one license category is required.",
            ["hr"] = "Potrebna je barem jedna kategorija vozačke dozvole."
        },
        [ErrorMessageKeys.ValidatorVinFormat] = new()
        {
            ["en"] = "VIN must be 17 characters and contain only alphanumeric characters (excluding I, O, Q).",
            ["hr"] = "VIN mora imati točno 17 znakova i sadržavati samo alfanumeričke znakove (bez I, O, Q)."
        },
        [ErrorMessageKeys.ValidatorYearRange] = new()
        {
            ["en"] = $"Year must be between 1900 and {DateTime.Today.Year + 1}.",
            ["hr"] = $"Godina mora biti između 1900 i {DateTime.Today.Year + 1}."
        },
        [ErrorMessageKeys.ValidatorStatusInvalid] = new()
        {
            ["en"] = "Status must be one of: active, service, retired, sold.",
            ["hr"] = "Status mora biti jedan od: active, service, retired, sold."
        },
        [ErrorMessageKeys.ValidatorValidToAfterFrom] = new()
        {
            ["en"] = "ValidTo must be after ValidFrom.",
            ["hr"] = "Datum završetka mora biti nakon datuma početka."
        },
        [ErrorMessageKeys.ValidatorPremiumPositive] = new()
        {
            ["en"] = "Premium must be greater than zero.",
            ["hr"] = "Premija mora biti veća od nule."
        },
        [ErrorMessageKeys.ValidatorFeeNonNegative] = new()
        {
            ["en"] = "Fee must be zero or greater.",
            ["hr"] = "Naknada mora biti nula ili više."
        },
    };

    public static string Get(string key, string lang)
    {
        if (_messages.TryGetValue(key, out var translations))
        {
            var locale = lang.StartsWith("hr") ? "hr" : "en";
            return translations.TryGetValue(locale, out var msg) ? msg : translations["en"];
        }

        // Key not found — return key so it's identifiable in logs
        return key;
    }
}
