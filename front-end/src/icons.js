const CLOUDINARY_IMAGE =
  "https://res.cloudinary.com/drxum5uxt/image/upload/c_limit,f_auto,q_auto,w_128";

export const ICONS = Object.freeze({
  home: `${CLOUDINARY_IMAGE}/v1785140678/trang_ch%E1%BB%A7_auue93.png`,
  booking:
    "https://res.cloudinary.com/drxum5uxt/image/upload/v1785142426/booking-removebg_udltii.png",
  content: `${CLOUDINARY_IMAGE}/v1785140676/n%E1%BB%99i_dung_yhhjhy.png`,
  affiliate: `${CLOUDINARY_IMAGE}/v1785140672/affiliate_ynwaky.png`,
  wallet: `${CLOUDINARY_IMAGE}/v1785140679/v%C3%AD_icfrdx.png`,
  kocApp: `${CLOUDINARY_IMAGE}/v1785140674/koc_app_wsfxgv.png`,
  business: `${CLOUDINARY_IMAGE}/v1785140673/business_ft0lrg.png`,
  admin: `${CLOUDINARY_IMAGE}/v1785140672/admin_qtwjgc.png`,
  overview: `${CLOUDINARY_IMAGE}/v1785140677/t%E1%BB%95ng_quan_fdhkmj.png`,
  search: `${CLOUDINARY_IMAGE}/v1785140676/t%C3%ACm_ki%E1%BA%BFm_lh3sti.png`,
  campaign: `${CLOUDINARY_IMAGE}/v1785140673/chi%E1%BA%BFn_d%E1%BB%8Bch_l%E1%BB%9Bn_ockjmv.png`,
  report: `${CLOUDINARY_IMAGE}/v1785140677/Thi%E1%BA%BFt_k%E1%BA%BF_ch%C6%B0a_c%C3%B3_t%C3%AAn_pnvmpl.png`,
  kpi: `${CLOUDINARY_IMAGE}/v1785140675/kpi_dashboard_powjdy.png`,
  approval: `${CLOUDINARY_IMAGE}/v1785140674/duy%E1%BB%87t_h%E1%BB%93_s%C6%A1_kqaluo.png`,
  coordination: `${CLOUDINARY_IMAGE}/v1785140674/%C4%91i%E1%BB%81u_ph%E1%BB%91i_chi%E1%BA%BFn_d%E1%BB%8Bch_oianxu.png`,
  settlement: `${CLOUDINARY_IMAGE}/v1785140673/%C4%91%E1%BB%91i_so%C3%A1t_chi_tr%E1%BA%A3_h69kqt.png`,
  aiClone:
    "https://res.cloudinary.com/drxum5uxt/image/upload/c_limit,f_auto,q_auto,w_128/v1785140672/AI_CLONE_t8tst7.png",
  ranking: `${CLOUDINARY_IMAGE}/v1785140679/x%E1%BA%BFp_h%E1%BA%A1ng_gi%C3%A1_ahljcl.png`,
  productData: `${CLOUDINARY_IMAGE}/v1785140673/d%E1%BB%AF_li%E1%BB%87u_sp_s%C3%A0n_xqlh9m.png`,
  kolRequest:
    "https://res.cloudinary.com/drxum5uxt/image/upload/v1785487939/Y%C3%8AU_C%E1%BA%A6U_KOL-removebg-preview_2_wr2zst.png",
  complaint:
    "https://res.cloudinary.com/drxum5uxt/image/upload/c_limit,f_auto,q_auto,w_128/v1785384292/Khi%E1%BA%BFu_n%E1%BA%A1i_ge5gay.png",
  quoteLead:
    "https://res.cloudinary.com/drxum5uxt/image/upload/c_limit,f_auto,q_auto,w_128/v1785384292/663ad064-ec65-4e7f-a402-0289c5cc1f93_lbcwo5.png",
  notification:
    "https://res.cloudinary.com/drxum5uxt/image/upload/v1785488567/Thi%E1%BA%BFt_k%E1%BA%BF_ch%C6%B0a_c%C3%B3_t%C3%AAn__4_-removebg-preview_uucjx7.png",
});

export function icon(name, className = "") {
  const src = ICONS[name];
  if (!src) return "";
  const classes = ["app-icon", className].filter(Boolean).join(" ");
  return `<img class="${classes}" src="${src}" alt="" aria-hidden="true" decoding="async">`;
}

export function brandLogo(className = "") {
  const classes = ["app-brand-lockup", className].filter(Boolean).join(" ");
  return `<span class="${classes}" aria-hidden="true"><img src="/images/koc-viet-logo.png" alt="" width="42" height="42" decoding="async"><span>KOC VIỆT</span></span>`;
}
