export const getFileUrl = (type: string) => {
  let finalUrl = "";
  switch (type) {
    case "tickets":
      finalUrl = `img/tickets/`;
      break;
    case "qrFile":
      finalUrl = `img/qrFile/`;
      break;
    case "aadhaar_front":
      finalUrl = `img/aadhaar_front/`;
      break;
    case "aadhaar_back":
      finalUrl = `img/aadhaar_back/`;
      break;
    case "pan":
      finalUrl = `img/pan/`;
      break;
    case "profile-photo":
      finalUrl = `img/profile-photo/`;
      break;
    case "creatives":
      finalUrl = `img/creatives/`;
      break;
  }
  return finalUrl;
};
