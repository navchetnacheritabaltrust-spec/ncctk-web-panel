    export const states= [
  { 
    "label": "राजस्थान", 
    "value": "rajasthan"
  },
  { 
    "label": "गुजरात", 
    "value": "gujarat"
  },
   {
    label: "महाराष्ट्र",
    value: "maharashtra"
  }
]

export const gender=[
  {
    "label": "महिला",
    "value": "female"
  },
  {
    "label": "पुरुष",
    "value": "male"
  }
]

export const districtsByState =
{
  "rajasthan": [
    // Existing districts you provided
    { "label_en": "Ajmer", "label": "अजमेर", "value": "ajmer" },
    { "label_en": "Alwar", "label": "अलवर", "value": "alwar" },
    { "label_en": "Anupgarh", "label": "अनूपगढ़", "value": "anupgarh" }, // New district in your list, keeping it
    { "label_en": "Banswara", "label": "बांसवाड़ा", "value": "banswara" },
    { "label_en": "Baran", "label": "बारां", "value": "baran" },
    { "label_en": "Barmer", "label": "बाड़मेर", "value": "barmer" },
    { "label_en": "Bharatpur", "label": "भरतपुर", "value": "bharatpur" },
    { "label_en": "Bhilwara", "label": "भीलवाड़ा", "value": "bhilwara" },
    { "label_en": "Bikaner", "label": "बीकानेर", "value": "bikaner" },
    { "label_en": "Bundi", "label": "बूंदी", "value": "bundi" },
    { "label_en": "Chittorgarh", "label": "चित्तौड़गढ़", "value": "chittorgarh" },
    { "label_en": "Churu", "label": "चूरू", "value": "churu" },
    { "label_en": "Dungarpur", "label": "डूंगरपुर", "value": "dungarpur" },
    { "label_en": "Hanumangarh", "label": "हनुमानगढ़", "value": "hanumangarh" },
    { "label_en": "Jaipur", "label": "जयपुर", "value": "jaipur" },
    { "label_en": "Jaisalmer", "label": "जैसलमेर", "value": "jaisalmer" },
    { "label_en": "Jalore", "label": "जालोर", "value": "jalore" },
    { "label_en": "Jhunjhunu", "label": "झुंझुनूं", "value": "jhunjhunu" },
    { "label_en": "Jodhpur", "label": "जोधपुर", "value": "jodhpur" },
    { "label_en": "Karauli", "label": "करौली", "value": "karauli" },
    { "label_en": "Kota", "label": "कोटा", "value": "kota" },
    { "label_en": "Nagaur", "label": "नागौर", "value": "nagaur" },
    { "label_en": "Pali", "label": "पाली", "value": "pali" },
    { "label_en": "Pratapgarh", "label": "प्रतापगढ़", "value": "pratapgarh" },
    { "label_en": "Rajsamand", "label": "राजसमंद", "value": "rajsamand" },
    { "label_en": "Sawai Madhopur", "label": "सवाई माधोपुर", "value": "sawai-madhopur" },
    { "label_en": "Sikar", "label": "सीकर", "value": "sikar" },
    { "label_en": "Sirohi", "label": "सिरोही", "value": "sirohi" },
    { "label_en": "Sri Ganganagar", "label": "श्रीगंगानगर", "value": "sri-ganganagar" },
    { "label_en": "Tonk", "label": "टोंक", "value": "tonk" },
    { "label_en": "Udaipur", "label": "उदयपुर", "value": "udaipur" },
    
    // Missing Districts (Including new ones) for Rajasthan
    { "label_en": "Balotra", "label": "बालोतरा", "value": "balotra" },
    { "label_en": "Beawar", "label": "ब्यावर", "value": "beawar" },
    { "label_en": "Dausa", "label": "दौसा", "value": "dausa" },
    { "label_en": "Deeg", "label": "डीग", "value": "deeg" },
    { "label_en": "Dholpur", "label": "धौलपुर", "value": "dholpur" },
    { "label_en": "Didwana-Kuchaman", "label": "डीडवाना-कुचामन", "value": "didwana-kuchaman" },
    { "label_en": "Dudu", "label": "दूदू", "value": "dudu" },
    { "label_en": "Jaipur Rural", "label": "जयपुर ग्रामीण", "value": "jaipur-rural" },
    { "label_en": "Jhalawar", "label": "झालावाड़", "value": "jhalawar" },
    { "label_en": "Jodhpur Rural", "label": "जोधपुर ग्रामीण", "value": "jodhpur-rural" },
    { "label_en": "Khairthal-Tijara", "label": "खैरथल-तिजारा", "value": "khairthal-tijara" },
    { "label_en": "Kotputli-Behror", "label": "कोटपुतली-बहरोड़", "value": "kotputli-behror" },
    { "label_en": "Neem Ka Thana", "label": "नीम का थाना", "value": "neem-ka-thana" },
    { "label_en": "Phalodi", "label": "फलौदी", "value": "phalodi" },
    { "label_en": "Salumbar", "label": "सलूम्बर", "value": "salumbar" },
    { "label_en": "Sanchore", "label": "सांचोर", "value": "sanchore" },
    { "label_en": "Shahpura", "label": "शाहपुरा", "value": "shahpura" }
  ],

  "gujarat": [
    // Existing districts you provided
    { "label_en": "Ahmedabad", "label": "अहमदाबाद", "value": "ahmedabad" },
    { "label_en": "Amreli", "label": "अमरेली", "value": "amreli" },
    { "label_en": "Anand", "label": "आणंद", "value": "anand" },
    { "label_en": "Aravalli", "label": "अरावली", "value": "aravalli" },
    { "label_en": "Banaskantha", "label": "बनासकांठा", "value": "banaskantha" },
    { "label_en": "Bharuch", "label": "भरूच", "value": "bharuch" },
    { "label_en": "Bhavnagar", "label": "भावनगर", "value": "bhavnagar" },
    { "label_en": "Botad", "label": "बोटाद", "value": "botad" },
    { "label_en": "Chhota Udaipur", "label": "छोटा उदयपुर", "value": "chhota-udaipur" },
    { "label_en": "Dahod", "label": "दाहोद", "value": "dahod" },
    { "label_en": "Dang", "label": "डांग", "value": "dang" },
    { "label_en": "Devbhoomi Dwarka", "label": "देवभूमि द्वारका", "value": "devbhoomi-dwarka" },
    { "label_en": "Gandhinagar", "label": "गांधीनगर", "value": "gandhinagar" },
    { "label_en": "Gir Somnath", "label": "गिर सोमनाथ", "value": "gir-somnath" },
    { "label_en": "Jamnagar", "label": "जामनगर", "value": "jamnagar" },
    { "label_en": "Junagadh", "label": "जूनागढ़", "value": "junagadh" },
    { "label_en": "Kutch", "label": "कच्छ", "value": "kutch" },
    { "label_en": "Kheda", "label": "खेड़ा", "value": "kheda" },
    { "label_en": "Mahisagar", "label": "महिसागर", "value": "mahisagar" },
    { "label_en": "Mehsana", "label": "मेहसाणा", "value": "mehsana" },
    { "label_en": "Morbi", "label": "मोरबी", "value": "morbi" },
    { "label_en": "Narmada", "label": "नर्मदा", "value": "narmada" },
    { "label_en": "Navsari", "label": "नवसारी", "value": "navsari" },
    { "label_en": "Panchmahal", "label": "पंचमहल", "value": "panchmahal" },
    
    // Missing Districts for Gujarat
    { "label_en": "Patan", "label": "पाटन", "value": "patan" },
    { "label_en": "Porbandar", "label": "पोरबंदर", "value": "porbandar" },
    { "label_en": "Rajkot", "label": "राजकोट", "value": "rajkot" },
    { "label_en": "Sabarkantha", "label": "साबरकांठा", "value": "sabarkantha" },
    { "label_en": "Surat", "label": "सूरत", "value": "surat" },
    { "label_en": "Surendranagar", "label": "सुरेन्द्रनगर", "value": "surendranagar" },
    { "label_en": "Tapi", "label": "तापी", "value": "tapi" },
    { "label_en": "Vadodara", "label": "वडोदरा", "value": "vadodara" },
    { "label_en": "Valsad", "label": "वलसाड", "value": "valsad" },
    { "label_en": "Vav-Tharad", "label": "वाव-थराद", "value": "vav-tharad" },
{ "label_en": "Suigam", "label": "सुईगाम", "value": "suigam" },
{ "label_en": "Dhanera", "label": "धानेरा", "value": "dhanera" }
  ],
   "maharashtra": [
    { label_en: "Ahmednagar", label: "अहमदनगर", value: "ahmednagar" },
    { label_en: "Akola", label: "अकोला", value: "akola" },
    { label_en: "Amravati", label: "अमरावती", value: "amravati" },
    { label_en: "Aurangabad", label: "औरंगाबाद", value: "aurangabad" },
    { label_en: "Beed", label: "बीड", value: "beed" },
    { label_en: "Bhandara", label: "भंडारा", value: "bhandara" },
    { label_en: "Buldhana", label: "बुलढाणा", value: "buldhana" },
    { label_en: "Chandrapur", label: "चंद्रपुर", value: "chandrapur" },
    { label_en: "Dhule", label: "धुले", value: "dhule" },
    { label_en: "Gadchiroli", label: "गडचिरोली", value: "gadchiroli" },
    { label_en: "Gondia", label: "गोंदिया", value: "gondia" },
    { label_en: "Hingoli", label: "हिंगोली", value: "hingoli" },
    { label_en: "Jalgaon", label: "जलगांव", value: "jalgaon" },
    { label_en: "Jalna", label: "जालना", value: "jalna" },
    { label_en: "Kolhapur", label: "कोल्हापुर", value: "kolhapur" },
    { label_en: "Latur", label: "लातूर", value: "latur" },
    { label_en: "Mumbai City", label: "मुंबई शहर", value: "mumbai-city" },
    { label_en: "Mumbai Suburban", label: "मुंबई उपनगर", value: "mumbai-suburban" },
    { label_en: "Nagpur", label: "नागपुर", value: "nagpur" },
    { label_en: "Nanded", label: "नांदेड़", value: "nanded" },
    { label_en: "Nandurbar", label: "नंदुरबार", value: "nandurbar" },
    { label_en: "Nashik", label: "नासिक", value: "nashik" },
    { label_en: "Osmanabad", label: "उस्मानाबाद", value: "osmanabad" },
    { label_en: "Palghar", label: "पालघर", value: "palghar" },
    { label_en: "Parbhani", label: "परभणी", value: "parbhani" },
    { label_en: "Pune", label: "पुणे", value: "pune" },
    { label_en: "Raigad", label: "रायगढ़", value: "raigad" },
    { label_en: "Ratnagiri", label: "रत्नागिरी", value: "ratnagiri" },
    { label_en: "Sangli", label: "सांगली", value: "sangli" },
    { label_en: "Satara", label: "सातारा", value: "satara" },
    { label_en: "Sindhudurg", label: "सिंधुदुर्ग", value: "sindhudurg" },
    { label_en: "Solapur", label: "सोलापुर", value: "solapur" },
    { label_en: "Thane", label: "ठाणे", value: "thane" },
    { label_en: "Wardha", label: "वर्धा", value: "wardha" },
    { label_en: "Washim", label: "वाशिम", value: "washim" },
    { label_en: "Yavatmal", label: "यवतमाल", value: "yavatmal" }
  ]
};
  