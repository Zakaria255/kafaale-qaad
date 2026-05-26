// ─── Kafaale Qaad — i18n translations ────────────────────────────────────────
// Languages: en · so · ar · tr · es · fr

export const LANGUAGES = [
  { code: "en", label: "English",  flag: "🇬🇧", dir: "ltr" },
  { code: "so", label: "Soomaali", flag: "🇸🇴", dir: "ltr" },
  { code: "ar", label: "العربية",  flag: "🇸🇦", dir: "rtl" },
  { code: "tr", label: "Türkçe",   flag: "🇹🇷", dir: "ltr" },
  { code: "es", label: "Español",  flag: "🇪🇸", dir: "ltr" },
  { code: "fr", label: "Français", flag: "🇫🇷", dir: "ltr" },
];

export const T = {
  // ── App ───────────────────────────────────────────────────────────────────
  appName: {
    en: "Kafaale Qaad", so: "Kafaale Qaad", ar: "كفاله قاد",
    tr: "Kafaale Qaad", es: "Kafaale Qaad", fr: "Kafaale Qaad",
  },
  appTagline: {
    en: "Humanitarian Aid Platform",
    so: "Goobta Gargaarka Bini'aadamnimada",
    ar: "منصة المساعدات الإنسانية",
    tr: "İnsani Yardım Platformu",
    es: "Plataforma de Ayuda Humanitaria",
    fr: "Plateforme d'Aide Humanitaire",
  },

  // ── Navbar ────────────────────────────────────────────────────────────────
  navHome: {
    en: "Home", so: "Hoyga", ar: "الرئيسية",
    tr: "Ana Sayfa", es: "Inicio", fr: "Accueil",
  },
  navAbout: {
    en: "About", so: "Ku saabsan", ar: "حول",
    tr: "Hakkında", es: "Acerca de", fr: "À propos",
  },
  navHowItWorks: {
    en: "How It Works", so: "Sida u shaqeeyo", ar: "كيف يعمل",
    tr: "Nasıl Çalışır", es: "Cómo Funciona", fr: "Comment ça marche",
  },
  navCases: {
    en: "Cases", so: "Xaaladaha", ar: "الحالات",
    tr: "Davalar", es: "Casos", fr: "Cas",
  },
  navDonate: {
    en: "Donate", so: "Deeq Bixi", ar: "تبرع",
    tr: "Bağış Yap", es: "Donar", fr: "Donner",
  },
  navContact: {
    en: "Contact", so: "Xiriir", ar: "تواصل",
    tr: "İletişim", es: "Contacto", fr: "Contact",
  },
  dashboard: {
    en: "Dashboard", so: "Xaashida", ar: "لوحة القيادة",
    tr: "Kontrol Paneli", es: "Panel", fr: "Tableau de bord",
  },
  signOut: {
    en: "Sign Out", so: "Ka bax", ar: "تسجيل الخروج",
    tr: "Çıkış Yap", es: "Cerrar Sesión", fr: "Déconnexion",
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  signIn: {
    en: "Sign In", so: "Gal", ar: "تسجيل الدخول",
    tr: "Giriş Yap", es: "Iniciar Sesión", fr: "Se Connecter",
  },
  register: {
    en: "Register", so: "Is-diiwaan-geli", ar: "التسجيل",
    tr: "Kayıt Ol", es: "Registrarse", fr: "S'inscrire",
  },
  email: {
    en: "Email Address", so: "Cinwaanka Emailka", ar: "عنوان البريد الإلكتروني",
    tr: "E-posta Adresi", es: "Correo Electrónico", fr: "Adresse E-mail",
  },
  password: {
    en: "Password (min 8 chars)", so: "Furaha sirta (8+ xaraf)", ar: "كلمة المرور (8 أحرف على الأقل)",
    tr: "Şifre (en az 8 karakter)", es: "Contraseña (mín. 8 caracteres)", fr: "Mot de passe (min. 8 caractères)",
  },
  fullName: {
    en: "Full Name", so: "Magaca Buuxa", ar: "الاسم الكامل",
    tr: "Tam Adı", es: "Nombre Completo", fr: "Nom Complet",
  },
  country: {
    en: "Country", so: "Dalka", ar: "الدولة",
    tr: "Ülke", es: "País", fr: "Pays",
  },
  city: {
    en: "City", so: "Magaalada", ar: "المدينة",
    tr: "Şehir", es: "Ciudad", fr: "Ville",
  },
  phone: {
    en: "Phone (optional)", so: "Telefoonka (ikhtiyaari)", ar: "الهاتف (اختياري)",
    tr: "Telefon (isteğe bağlı)", es: "Teléfono (opcional)", fr: "Téléphone (optionnel)",
  },
  createAccount: {
    en: "Create Account", so: "Samee Akoon", ar: "إنشاء حساب",
    tr: "Hesap Oluştur", es: "Crear Cuenta", fr: "Créer un Compte",
  },
  backToHome: {
    en: "← Back to Home", so: "← Ku noqo Bogga Hore", ar: "← العودة للرئيسية",
    tr: "← Ana Sayfaya Dön", es: "← Volver al Inicio", fr: "← Retour à l'accueil",
  },
  pleaseWait: {
    en: "Please wait…", so: "Fadlan sug…", ar: "يرجى الانتظار…",
    tr: "Lütfen bekleyin…", es: "Por favor espere…", fr: "Veuillez patienter…",
  },
  roleReporter: {
    en: "📝 Reporter — Report emergency cases",
    so: "📝 Warbixiye — Xaalado degdeg ah soo gudbi",
    ar: "📝 مراسل — الإبلاغ عن الحالات الطارئة",
    tr: "📝 Muhabir — Acil durumları bildir",
    es: "📝 Reportero — Reportar casos de emergencia",
    fr: "📝 Rapporteur — Signaler des cas d'urgence",
  },
  roleDonor: {
    en: "💳 Donor / Sponsor — Fund verified cases",
    so: "💳 Deeq bixiye — Ku maalgashi xaalado xaqiijisan",
    ar: "💳 المتبرع — تمويل الحالات الموثقة",
    tr: "💳 Bağışçı — Doğrulanmış vakaları finanse et",
    es: "💳 Donante — Financiar casos verificados",
    fr: "💳 Donateur — Financer les cas vérifiés",
  },

  // ── Header / Nav ──────────────────────────────────────────────────────────
  exit: {
    en: "Exit", so: "Ka bax", ar: "خروج",
    tr: "Çıkış", es: "Salir", fr: "Quitter",
  },
  searchCases: {
    en: "Search cases…", so: "Raadi xaaladaha…", ar: "ابحث عن الحالات…",
    tr: "Dava ara…", es: "Buscar casos…", fr: "Rechercher des cas…",
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  overview: {
    en: "🏠 Overview", so: "🏠 Guud ahaan", ar: "🏠 نظرة عامة",
    tr: "🏠 Genel Bakış", es: "🏠 Resumen", fr: "🏠 Aperçu",
  },
  analytics: {
    en: "📊 Analytics", so: "📊 Falanqaynta", ar: "📊 التحليلات",
    tr: "📊 Analitik", es: "📊 Análisis", fr: "📊 Analytique",
  },
  users: {
    en: "👥 Users", so: "👥 Isticmaalayaasha", ar: "👥 المستخدمون",
    tr: "👥 Kullanıcılar", es: "👥 Usuarios", fr: "👥 Utilisateurs",
  },
  allCases: {
    en: "📋 All Cases", so: "📋 Dhammaan Xaaladaha", ar: "📋 جميع الحالات",
    tr: "📋 Tüm Davalar", es: "📋 Todos los Casos", fr: "📋 Tous les Cas",
  },
  donations: {
    en: "💰 Donations", so: "💰 Deeqaha", ar: "💰 التبرعات",
    tr: "💰 Bağışlar", es: "💰 Donaciones", fr: "💰 Dons",
  },
  addUser: {
    en: "+ Add User", so: "+ Kudar Isticmaale", ar: "+ إضافة مستخدم",
    tr: "+ Kullanıcı Ekle", es: "+ Agregar Usuario", fr: "+ Ajouter Utilisateur",
  },
  exportData: {
    en: "📥 Export", so: "📥 Dhoofso", ar: "📥 تصدير",
    tr: "📥 Dışa Aktar", es: "📥 Exportar", fr: "📥 Exporter",
  },
  deleteUser: {
    en: "🗑️ Delete", so: "🗑️ Tirtir", ar: "🗑️ حذف",
    tr: "🗑️ Sil", es: "🗑️ Eliminar", fr: "🗑️ Supprimer",
  },
  totalCases: {
    en: "Total Cases", so: "Wadarta Xaaladaha", ar: "إجمالي الحالات",
    tr: "Toplam Davalar", es: "Total de Casos", fr: "Total des Cas",
  },
  totalUsers: {
    en: "Total Users", so: "Wadarta Isticmaalayaasha", ar: "إجمالي المستخدمين",
    tr: "Toplam Kullanıcılar", es: "Total de Usuarios", fr: "Total des Utilisateurs",
  },
  totalDonated: {
    en: "Total Donated", so: "Wadarta Deeqaha", ar: "إجمالي التبرعات",
    tr: "Toplam Bağış", es: "Total Donado", fr: "Total Donné",
  },
  completed: {
    en: "Completed", so: "La dhammeeyay", ar: "مكتملة",
    tr: "Tamamlandı", es: "Completado", fr: "Terminé",
  },

  // ── Roles ─────────────────────────────────────────────────────────────────
  roleSuperAdmin: {
    en: "Super Admin", so: "Maamulaha Sare", ar: "المدير العام",
    tr: "Süper Yönetici", es: "Super Administrador", fr: "Super Administrateur",
  },
  roleAdmin: {
    en: "Admin", so: "Maamule", ar: "المدير",
    tr: "Yönetici", es: "Administrador", fr: "Administrateur",
  },
  roleFieldAgent: {
    en: "Field Agent", so: "Wakiilka Goobta", ar: "عميل ميداني",
    tr: "Saha Ajan", es: "Agente de Campo", fr: "Agent de Terrain",
  },
  roleDonorLabel: {
    en: "Donor", so: "Deeq bixiye", ar: "متبرع",
    tr: "Bağışçı", es: "Donante", fr: "Donateur",
  },
  roleReporterLabel: {
    en: "Reporter", so: "Warbixiye", ar: "مراسل",
    tr: "Muhabir", es: "Reportero", fr: "Rapporteur",
  },

  // ── Cases ─────────────────────────────────────────────────────────────────
  submitCase: {
    en: "📝 Report Case", so: "📝 Soo Gudbi Xaalad", ar: "📝 الإبلاغ عن حالة",
    tr: "📝 Vaka Bildir", es: "📝 Reportar Caso", fr: "📝 Signaler un Cas",
  },
  viewDetails: {
    en: "View", so: "Arag", ar: "عرض",
    tr: "Görüntüle", es: "Ver", fr: "Voir",
  },
  status: {
    en: "Status", so: "Xaaladda", ar: "الحالة",
    tr: "Durum", es: "Estado", fr: "Statut",
  },
  urgency: {
    en: "Urgency", so: "Degdegnimada", ar: "الأهمية",
    tr: "Aciliyet", es: "Urgencia", fr: "Urgence",
  },
  location: {
    en: "Location", so: "Goobta", ar: "الموقع",
    tr: "Konum", es: "Ubicación", fr: "Emplacement",
  },
  noCasesFound: {
    en: "No cases found", so: "Xaaladaha lama helin", ar: "لا توجد حالات",
    tr: "Dava bulunamadı", es: "No se encontraron casos", fr: "Aucun cas trouvé",
  },

  // ── Common ────────────────────────────────────────────────────────────────
  cancel: {
    en: "Cancel", so: "Jooji", ar: "إلغاء",
    tr: "İptal", es: "Cancelar", fr: "Annuler",
  },
  save: {
    en: "Save", so: "Kaydi", ar: "حفظ",
    tr: "Kaydet", es: "Guardar", fr: "Enregistrer",
  },
  close: {
    en: "Close", so: "Xidh", ar: "إغلاق",
    tr: "Kapat", es: "Cerrar", fr: "Fermer",
  },
  loading: {
    en: "Loading…", so: "Waa la rarayo…", ar: "جارٍ التحميل…",
    tr: "Yükleniyor…", es: "Cargando…", fr: "Chargement…",
  },
  active: {
    en: "Active", so: "Firfircoon", ar: "نشط",
    tr: "Aktif", es: "Activo", fr: "Actif",
  },
  inactive: {
    en: "Inactive", so: "Aan firfircoonayn", ar: "غير نشط",
    tr: "Pasif", es: "Inactivo", fr: "Inactif",
  },
  name: {
    en: "Name", so: "Magaca", ar: "الاسم",
    tr: "Ad", es: "Nombre", fr: "Nom",
  },
  role: {
    en: "Role", so: "Doorka", ar: "الدور",
    tr: "Rol", es: "Rol", fr: "Rôle",
  },
  actions: {
    en: "Actions", so: "Ficilada", ar: "الإجراءات",
    tr: "İşlemler", es: "Acciones", fr: "Actions",
  },
  welcomeBack: {
    en: "Welcome back", so: "Ku soo dhawoow", ar: "مرحبًا بعودتك",
    tr: "Tekrar hoş geldiniz", es: "Bienvenido de vuelta", fr: "Bon retour",
  },
  adminCommandCenter: {
    en: "🛡️ Admin Command Center",
    so: "🛡️ Xarunta Amarka Maamulka",
    ar: "🛡️ مركز قيادة الإدارة",
    tr: "🛡️ Yönetim Komuta Merkezi",
    es: "🛡️ Centro de Comando Admin",
    fr: "🛡️ Centre de Commandement Admin",
  },
  fullOversight: {
    en: "Full system oversight & management",
    so: "Kormeer iyo maamul buuxa oo nidaamka ah",
    ar: "الإشراف الكامل على النظام وإدارته",
    tr: "Tam sistem gözetimi ve yönetimi",
    es: "Supervisión y gestión completa del sistema",
    fr: "Supervision et gestion complète du système",
  },
};

// ── Helper: get translation ───────────────────────────────────────────────────
export function t(key, lang = "en") {
  const entry = T[key];
  if (!entry) return key;
  return entry[lang] || entry["en"] || key;
}

export const DEFAULT_LANG = "en";
