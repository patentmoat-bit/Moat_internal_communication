/**
 * Official USPTO Country Codes & WIPO Standard ST.3 Table
 * Source: https://www.uspto.gov/patents/apply/applying-online/country-codes-wipo-st3-table
 */

export interface WipoJurisdiction {
  code: string;
  name: string;
  flag?: string;
  category?: 'IP5' | 'REGIONAL_ORG' | 'NATIONAL_OFFICE';
}

export const IP5_CODES = ['US', 'EP', 'CN', 'JP', 'KR'];
export const MAJOR_HUBS = ['US', 'EP', 'WO', 'CN', 'JP', 'KR', 'GB', 'DE', 'IN', 'CA', 'AU', 'IL', 'SG', 'FR', 'CH'];

export const WIPO_ST3_JURISDICTIONS: WipoJurisdiction[] = [
  {
    "code": "AD",
    "name": "Andorra",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "AE",
    "name": "United Arab Emirates",
    "flag": "\ud83c\udde6\ud83c\uddea",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "AF",
    "name": "Afghanistan",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "AG",
    "name": "Antigua And Barbuda",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "AI",
    "name": "Anguilla",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "AL",
    "name": "Albania",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "AM",
    "name": "Armenia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "AN",
    "name": "Netherlands Antilles",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "AO",
    "name": "Angola",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "AP",
    "name": "African Regional Intellectual Property Organization (Aripo)(1)",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "REGIONAL_ORG"
  },
  {
    "code": "AQ",
    "name": "Antarctica",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "AR",
    "name": "Argentina",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "AT",
    "name": "Austria",
    "flag": "\ud83c\udde6\ud83c\uddf9",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "AU",
    "name": "Australia",
    "flag": "\ud83c\udde6\ud83c\uddfa",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "AW",
    "name": "Aruba",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "AZ",
    "name": "Azerbaijan",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BA",
    "name": "Bosnia And Herzegovina",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BB",
    "name": "Barbados",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BD",
    "name": "Bangladesh",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BE",
    "name": "Belgium",
    "flag": "\ud83c\udde7\ud83c\uddea",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BF",
    "name": "Burkina Faso",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BG",
    "name": "Bulgaria",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BH",
    "name": "Bahrain",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BI",
    "name": "Burundi",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BJ",
    "name": "Benin",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BM",
    "name": "Bermuda",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BN",
    "name": "Brunei Darussalam",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BO",
    "name": "Bolivia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BR",
    "name": "Brazil",
    "flag": "\ud83c\udde7\ud83c\uddf7",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BS",
    "name": "Bahamas",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BT",
    "name": "Bhutan",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BV",
    "name": "Bouvet Island",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BW",
    "name": "Botswana",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BX",
    "name": "Benelux Office For Intellectual Property (Boip) (2)",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "REGIONAL_ORG"
  },
  {
    "code": "BY",
    "name": "Belarus",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "BZ",
    "name": "Belize",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CA",
    "name": "Canada",
    "flag": "\ud83c\udde8\ud83c\udde6",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CC",
    "name": "Cocos (Keeling) Islands",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CD",
    "name": "Congo, The Democratic Republic Of The",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CF",
    "name": "Central African Republic",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CG",
    "name": "Congo",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CH",
    "name": "Switzerland",
    "flag": "\ud83c\udde8\ud83c\udded",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CI",
    "name": "Cote D'Ivoire",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CK",
    "name": "Cook Islands",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CL",
    "name": "Chile",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CM",
    "name": "Cameroon",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CN",
    "name": "China",
    "flag": "\ud83c\udde8\ud83c\uddf3",
    "category": "IP5"
  },
  {
    "code": "CO",
    "name": "Colombia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CR",
    "name": "Costa Rica",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CS",
    "name": "Czechoslovakia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CT",
    "name": "Canton And Enderbury Islands",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CU",
    "name": "Cuba",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CV",
    "name": "Cape Verde",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CX",
    "name": "Christmas Island",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CY",
    "name": "Cyprus",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "CZ",
    "name": "Czechia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "DD",
    "name": "German Democratic Republic",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "DE",
    "name": "Germany",
    "flag": "\ud83c\udde9\ud83c\uddea",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "DJ",
    "name": "Djibouti",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "DK",
    "name": "Denmark",
    "flag": "\ud83c\udde9\ud83c\uddf0",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "DM",
    "name": "Dominica",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "DO",
    "name": "Dominican Republic",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "DZ",
    "name": "Algeria",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "EA",
    "name": "Eurasian Patent Organization (Eapo)(1)",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "REGIONAL_ORG"
  },
  {
    "code": "EC",
    "name": "Ecuador",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "EE",
    "name": "Estonia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "EG",
    "name": "Egypt",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "EH",
    "name": "Western Sahara",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "EM",
    "name": "Office For Harmonization In The Internal Market (Trade Marks And Designs) (Ohim)",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "REGIONAL_ORG"
  },
  {
    "code": "EP",
    "name": "European Patent Office (Epo)(1)",
    "flag": "\ud83c\uddea\ud83c\uddfa",
    "category": "IP5"
  },
  {
    "code": "ER",
    "name": "Eritrea",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "ES",
    "name": "Spain",
    "flag": "\ud83c\uddea\ud83c\uddf8",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "ET",
    "name": "Ethiopia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "FI",
    "name": "Finland",
    "flag": "\ud83c\uddeb\ud83c\uddee",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "FJ",
    "name": "Fiji",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "FK",
    "name": "Falkland Islands (Malvinas)",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "FM",
    "name": "Mircronesia, Federated States Of",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "FO",
    "name": "Faroe Islands",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "FQ",
    "name": "French Southern And Antarctic Territories",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "FR",
    "name": "France",
    "flag": "\ud83c\uddeb\ud83c\uddf7",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GA",
    "name": "Gabon",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GB",
    "name": "United Kingdom",
    "flag": "\ud83c\uddec\ud83c\udde7",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GC",
    "name": "Patent Office Of The Cooperation Council For The Arab States Of The Gulf (Gcc)",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "REGIONAL_ORG"
  },
  {
    "code": "GD",
    "name": "Grenada",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GE",
    "name": "Georgia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GF",
    "name": "French Guiana",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GG",
    "name": "Guernsey.",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GH",
    "name": "Ghana",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GI",
    "name": "Gibraltar",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GL",
    "name": "Greenland",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GM",
    "name": "Gambia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GN",
    "name": "Guinea",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GP",
    "name": "Guadeloupe",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GQ",
    "name": "Equatorial Guinea",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GR",
    "name": "Greece",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GS",
    "name": "South Georgia And The South Sandwich Islands",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GT",
    "name": "Guatemala",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GW",
    "name": "Guinea-Bissau",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "GY",
    "name": "Guyana",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "HK",
    "name": "Hong Kong",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "HM",
    "name": "Heard Island And Mcdonald Islands",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "HN",
    "name": "Honduras",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "HR",
    "name": "Croatia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "HT",
    "name": "Haiti",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "HU",
    "name": "Hungary",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "ID",
    "name": "Indonesia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "IE",
    "name": "Ireland",
    "flag": "\ud83c\uddee\ud83c\uddea",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "IL",
    "name": "Israel",
    "flag": "\ud83c\uddee\ud83c\uddf1",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "IM",
    "name": "Isle Of Man",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "IN",
    "name": "India",
    "flag": "\ud83c\uddee\ud83c\uddf3",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "IO",
    "name": "British Indian Ocean Territory",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "IQ",
    "name": "Iraq",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "IR",
    "name": "Iran, Islamic Republic Of",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "IS",
    "name": "Iceland",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "IT",
    "name": "Italy",
    "flag": "\ud83c\uddee\ud83c\uddf9",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "JE",
    "name": "Jersey",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "JM",
    "name": "Jamaica",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "JO",
    "name": "Jordan",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "JP",
    "name": "Japan",
    "flag": "\ud83c\uddef\ud83c\uddf5",
    "category": "IP5"
  },
  {
    "code": "KE",
    "name": "Kenya",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "KG",
    "name": "Kyrgyzstan",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "KH",
    "name": "Cambodia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "KI",
    "name": "Kiribati",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "KM",
    "name": "Comoros",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "KN",
    "name": "Saint Kitts And Nevis",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "KP",
    "name": "Korea, Democratic People'S Republic Of",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "KR",
    "name": "Korea, Republic Of",
    "flag": "\ud83c\uddf0\ud83c\uddf7",
    "category": "IP5"
  },
  {
    "code": "KW",
    "name": "Kuwait",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "KY",
    "name": "Cayman Islands",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "KZ",
    "name": "Kazakstan",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "LA",
    "name": "Lao People'S Democratic Republic",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "LB",
    "name": "Lebanon",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "LC",
    "name": "Saint Lucia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "LI",
    "name": "Liechtenstein",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "LK",
    "name": "Sri Lanka",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "LR",
    "name": "Liberia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "LS",
    "name": "Lesotho",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "LT",
    "name": "Lithuania",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "LU",
    "name": "Luxembourg",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "LV",
    "name": "Latvia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "LY",
    "name": "Libyan Arab Jamahiriya",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MA",
    "name": "Morocco",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MC",
    "name": "Monaco",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MD",
    "name": "Moldova, Republic Of",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "ME",
    "name": "Montenegro.",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MG",
    "name": "Madagascar",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MH",
    "name": "Marshall Islands",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MK",
    "name": "Macedonia, The Former Yugoslav Republic Of",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "ML",
    "name": "Mali",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MM",
    "name": "Myanmar",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MN",
    "name": "Mongolia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MO",
    "name": "Macau",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MP",
    "name": "Northern Mariana Islands",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MQ",
    "name": "Martinique",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MR",
    "name": "Mauritania",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MS",
    "name": "Montserrat",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MT",
    "name": "Malta",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MU",
    "name": "Mauritius",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MV",
    "name": "Maldives",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MW",
    "name": "Malawi",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MX",
    "name": "Mexico",
    "flag": "\ud83c\uddf2\ud83c\uddfd",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MY",
    "name": "Malaysia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "MZ",
    "name": "Mozambique",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "NA",
    "name": "Namibia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "NC",
    "name": "New Caledonia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "NE",
    "name": "Niger",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "NF",
    "name": "Norfolk Island",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "NG",
    "name": "Nigeria",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "NI",
    "name": "Nicaragua",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "NL",
    "name": "Netherlands",
    "flag": "\ud83c\uddf3\ud83c\uddf1",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "NO",
    "name": "Norway",
    "flag": "\ud83c\uddf3\ud83c\uddf4",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "NP",
    "name": "Nepal",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "NQ",
    "name": "Dronning Maud Land",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "NR",
    "name": "Nauru",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "NT",
    "name": "Neutral Zone",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "NU",
    "name": "Niue",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "NZ",
    "name": "New Zealand",
    "flag": "\ud83c\uddf3\ud83c\uddff",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "OA",
    "name": "African Intellectual Property Organization (Oapi)(1)",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "REGIONAL_ORG"
  },
  {
    "code": "OM",
    "name": "Oman",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "PA",
    "name": "Panama",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "PC",
    "name": "Pacific Islands (Trust Territory)",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "PE",
    "name": "Peru",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "PF",
    "name": "French Polynesia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "PG",
    "name": "Papua New Guinea",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "PH",
    "name": "Philippines",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "PK",
    "name": "Pakistan",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "PL",
    "name": "Poland",
    "flag": "\ud83c\uddf5\ud83c\uddf1",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "PM",
    "name": "Saint Pierre And Miquelon",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "PN",
    "name": "Pitcairn",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "PT",
    "name": "Portugal",
    "flag": "\ud83c\uddf5\ud83c\uddf9",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "PW",
    "name": "Palau",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "PY",
    "name": "Paraguay",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "PZ",
    "name": "Panama Canal Zone",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "QA",
    "name": "Qatar",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "QP",
    "name": "Paracel Islands",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "QZ",
    "name": "Community Plant Variety Office (European Community) (Cpvo)",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "RE",
    "name": "Reunion",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "RO",
    "name": "Romania",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "RS",
    "name": "Serbia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "RU",
    "name": "Russian Federation",
    "flag": "\ud83c\uddf7\ud83c\uddfa",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "RW",
    "name": "Rwanda",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SA",
    "name": "Saudi Arabia",
    "flag": "\ud83c\uddf8\ud83c\udde6",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SB",
    "name": "Solomon Islands",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SC",
    "name": "Seychelles",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SD",
    "name": "Sudan",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SE",
    "name": "Sweden",
    "flag": "\ud83c\uddf8\ud83c\uddea",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SG",
    "name": "Singapore",
    "flag": "\ud83c\uddf8\ud83c\uddec",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SH",
    "name": "Saint Helena",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SI",
    "name": "Slovenia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SJ",
    "name": "Svalbard And Jan Mayen",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SK",
    "name": "Slovakia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SL",
    "name": "Sierra Leone",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SM",
    "name": "San Marino",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SN",
    "name": "Senegal",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SO",
    "name": "Somalia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SR",
    "name": "Suriname",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "ST",
    "name": "Sao Tome And Principe",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SU",
    "name": "Union Of Soviet Socialist Republics",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SV",
    "name": "El Salvador",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SY",
    "name": "Syrian Arab Republic",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "SZ",
    "name": "Swaziland",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TC",
    "name": "Turks And Caicos Islands",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TD",
    "name": "Chad",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TF",
    "name": "French Southern Territories",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TG",
    "name": "Togo",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TH",
    "name": "Thailand",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TJ",
    "name": "Tajikistan",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TK",
    "name": "Tokelau",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TL",
    "name": "Timor-Leste",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TM",
    "name": "Turkmenistan",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TN",
    "name": "Tunisia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TO",
    "name": "Tonga",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TP",
    "name": "East Timor",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TR",
    "name": "Turkey",
    "flag": "\ud83c\uddf9\ud83c\uddf7",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TT",
    "name": "Trinidad And Tobago",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TV",
    "name": "Tuvalu",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TW",
    "name": "Taiwan",
    "flag": "\ud83c\uddf9\ud83c\uddfc",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "TZ",
    "name": "Tanzania, United Republic Of",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "UA",
    "name": "Ukraine",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "UG",
    "name": "Uganda",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "US",
    "name": "United States",
    "flag": "\ud83c\uddfa\ud83c\uddf8",
    "category": "IP5"
  },
  {
    "code": "UY",
    "name": "Uruguay",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "UZ",
    "name": "Uzbekistan",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "VA",
    "name": "Holy See (Vatican City State)",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "VC",
    "name": "Saint Vincent And The Grenadines",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "VD",
    "name": "Viet-Nam, Democratic Republic Of",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "VE",
    "name": "Venezuela",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "VG",
    "name": "Virgin Islands, British",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "VN",
    "name": "Viet Nam",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "VU",
    "name": "Vanuatu",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "WF",
    "name": "Wallis And Futuna",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "WO",
    "name": "World Intellectual Property Organization (Wipo / Pct)",
    "flag": "\ud83c\udf10",
    "category": "REGIONAL_ORG"
  },
  {
    "code": "WS",
    "name": "Samoa",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "XN",
    "name": "Nordic Patent Institute (Npi)",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "XP",
    "name": "Not Provided",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "YD",
    "name": "Yemen, Democratic",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "YE",
    "name": "Yemen",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "YT",
    "name": "Mayotte",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "YU",
    "name": "Yugoslavia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "ZA",
    "name": "South Africa",
    "flag": "\ud83c\uddff\ud83c\udde6",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "ZM",
    "name": "Zambia",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "ZW",
    "name": "Zimbabwe",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  },
  {
    "code": "ZZ",
    "name": "Stateless",
    "flag": "\ud83c\udff3\ufe0f",
    "category": "NATIONAL_OFFICE"
  }
];
