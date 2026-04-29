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
    case "gst_certificate":
      finalUrl = `img/gst_certificate/`;
      break;
    case "shop_image":
      finalUrl = `img/shop_image/`;
      break;
  }
  return finalUrl;
};
