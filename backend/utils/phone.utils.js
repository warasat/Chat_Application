import { parsePhoneNumberFromString } from "libphonenumber-js";

export const formatAndValidatePhone = (phoneNumber) => {
  let checkNumber = phoneNumber.startsWith("+")
    ? phoneNumber
    : `+${phoneNumber}`;
  const phoneNumberObj = parsePhoneNumberFromString(checkNumber);

  if (!phoneNumberObj || !phoneNumberObj.isValid()) {
    throw new Error(
      "Invalid phone number format. Please include country code."
    );
  }
  return phoneNumberObj.number;
};
