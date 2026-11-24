"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { io } from "socket.io-client";
import "./chat.css";

const maxImageBytes = 6 * 1024 * 1024;
const maxMediaBytes = 12 * 1024 * 1024;
const displayBrightnessStorageKey = "pharmacy_chat_display_brightness";
const displayAccentStorageKey = "pharmacy_chat_display_accent";
const defaultDisplayPreferences = { brightness: 100, accentColor: "#176f5d" };
const displayPreferencesEvent = "pharmacy-chat-display-preferences";
const supportedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const supportedMediaTypes = [...supportedImageTypes, "video/mp4", "video/webm", "audio/mp4", "audio/webm", "audio/ogg", "audio/mpeg", "audio/wav"];
const languageStorageKey = "pharmacy_dash_lang";
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

function getStoredDisplayPreferences() {
  const storedBrightness = localStorage.getItem(displayBrightnessStorageKey);
  const storedAccent = localStorage.getItem(displayAccentStorageKey);
  const brightness = Number(storedBrightness);
  return JSON.stringify({
    brightness: storedBrightness !== null && Number.isFinite(brightness)
      ? Math.min(130, Math.max(70, Math.round(brightness)))
      : defaultDisplayPreferences.brightness,
    accentColor: storedAccent && /^#[\da-f]{6}$/i.test(storedAccent)
      ? storedAccent
      : defaultDisplayPreferences.accentColor,
  });
}

function getServerDisplayPreferences() {
  return JSON.stringify(defaultDisplayPreferences);
}

function subscribeToDisplayPreferences(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(displayPreferencesEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(displayPreferencesEvent, callback);
  };
}

const chatTranslations = {
  en: {
    back: "← Back to Pharmacy ELAF", privateChat: "PHARMACY ELAF · PRIVATE CHAT",
    headline: "Stay close, wherever you are.", authIntro: "Create a free chat account to message family, friends, and the Pharmacy ELAF team.",
    signIn: "Sign in", createAccount: "Create account", fullName: "Full name", email: "Email address",
    password: "Password", showPassword: "Show password", hidePassword: "Hide password",
    pleaseWait: "Please wait…", createFreeAccount: "Create free account", signInToChat: "Sign in to chat",
    authFootnote: "Your password is hashed before it is stored. Use the same MongoDB sign-in for chat and Pharmacy ELAF; storefront data stays on this device.",
    connecting: "Connecting to chat…", teamChat: "TEAM CHAT", signOut: "Sign out", signOutTitle: "Sign out of chat?",
    signOutDescription: "You’ll need to sign in again to view conversations and send messages on this device.",
    signingOut: "Signing out…", language: "Language",
    accountOptions: "Account options", closeModal: "Close dialog", backToConversations: "Back to conversations",
    onlineLabel: "Online", teamMember: "Team member", sharedInChat: "Shared in chat", selectedPreview: "Selected image preview",
    yourPeople: "YOUR PEOPLE", startChat: "Start a chat", messages: "Messages", findPerson: "Find a person",
    closeContacts: "Close contacts", newChat: "New chat", newGroup: "New group", searchMembers: "Search registered people",
    registeredMembers: "REGISTERED CHAT MEMBERS", startPrivate: "Start a private chat",
    noMembers: "No members found.", joinChat: "They can create a free chat account to join.",
    searchChats: "Search chats", recent: "RECENT", privateConversation: "Private conversation",
    onlineNow: "Online now", live: "Live", members: "{count} members", groupMembers: "{count} members · {online} online",
    membersOnly: "Messages are visible only to conversation members", loadingMessages: "Loading messages…",
    sayHello: "Say hello to {name}", imagesAppear: "Your messages and shared images will appear here.",
    bringTogether: "BRING EVERYONE TOGETHER", createGroup: "Create a group", groupName: "Group name",
    groupNamePlaceholder: "Family, friends, or Pharmacy ELAF team", choosePeople: "Choose people",
    selected: "{count} selected", createGroupChat: "Create group chat", groupRequired: "Add a group name and at least one person.",
    noChatMembers: "Other people can join by creating a free chat account.",
    loadingConversations: "Loading conversations…", startHere: "Your conversations start here",
    startHereDescription: "Find a registered member or create a group with family, friends, or your team.",
    together: "TOGETHER, EVERYWHERE", welcomeHeadline: "Good conversations make a great team.",
    welcomeDescription: "Start a private conversation or bring family, friends, and Pharmacy ELAF teammates together in a group.",
    findPeople: "Find people", writeMessage: "Write a message…", sendMessage: "Send message", attachImage: "Attach an image",
    removeImage: "Remove selected image", composerHint: "Share text or an image up to 6 MB · max 4,000 characters",
    profilePhoto: "Change profile photo", uploadingPhoto: "Uploading photo…", photoSaved: "Profile photo updated.",
    photoRemoved: "Profile photo removed.", messageSent: "Message sent successfully.", groupCreated: "Group created successfully.",
    chooseImage: "Choose a JPG, PNG, WebP, or GIF image.", imageTooLarge: "Images must be 6 MB or smaller.",
    unsupportedImage: "The selected file is not a supported image.", imageUpload: "Upload profile photo",
    removePhoto: "Remove profile photo", photoUploadError: "Unable to update your profile photo."
  },
  fr: {
    back: "← Retour à Pharmacy ELAF", privateChat: "PHARMACY ELAF · DISCUSSION PRIVÉE",
    headline: "Restez proches, où que vous soyez.", authIntro: "Créez un compte gratuit pour discuter avec votre famille, vos amis et l’équipe Pharmacy ELAF.",
    signIn: "Connexion", createAccount: "Créer un compte", fullName: "Nom complet", email: "Adresse e-mail",
    password: "Mot de passe", showPassword: "Afficher le mot de passe", hidePassword: "Masquer le mot de passe",
    pleaseWait: "Veuillez patienter…", createFreeAccount: "Créer un compte gratuit", signInToChat: "Se connecter",
    authFootnote: "Votre mot de passe est haché avant son stockage. Utilisez le même compte MongoDB pour le chat et Pharmacy ELAF ; les données de la boutique restent sur cet appareil.",
    connecting: "Connexion à la discussion…", teamChat: "DISCUSSION D’ÉQUIPE", signOut: "Déconnexion", signOutTitle: "Se déconnecter du chat ?",
    signOutDescription: "Vous devrez vous reconnecter pour consulter les conversations et envoyer des messages sur cet appareil.",
    signingOut: "Déconnexion…", language: "Langue",
    accountOptions: "Options du compte", closeModal: "Fermer la fenêtre", backToConversations: "Retour aux conversations",
    onlineLabel: "En ligne", teamMember: "Membre de l’équipe", sharedInChat: "Partagée dans la discussion", selectedPreview: "Aperçu de l’image sélectionnée",
    yourPeople: "VOS CONTACTS", startChat: "Démarrer une discussion", messages: "Messages", findPerson: "Trouver une personne",
    closeContacts: "Fermer les contacts", newChat: "Nouvelle discussion", newGroup: "Nouveau groupe", searchMembers: "Rechercher des personnes inscrites",
    registeredMembers: "MEMBRES INSCRITS", startPrivate: "Démarrer une discussion privée",
    noMembers: "Aucun membre trouvé.", joinChat: "Ils peuvent créer un compte gratuit pour rejoindre la discussion.",
    searchChats: "Rechercher des discussions", recent: "RÉCENT", privateConversation: "Discussion privée",
    onlineNow: "En ligne", live: "En direct", members: "{count} membres", groupMembers: "{count} membres · {online} en ligne",
    membersOnly: "Les messages sont visibles uniquement par les membres de la conversation", loadingMessages: "Chargement des messages…",
    sayHello: "Dites bonjour à {name}", imagesAppear: "Vos messages et images partagées apparaîtront ici.",
    bringTogether: "RASSEMBLER TOUT LE MONDE", createGroup: "Créer un groupe", groupName: "Nom du groupe",
    groupNamePlaceholder: "Famille, amis ou équipe Pharmacy ELAF", choosePeople: "Choisir les personnes",
    selected: "{count} sélectionné(s)", createGroupChat: "Créer le groupe", groupRequired: "Ajoutez un nom de groupe et au moins une personne.",
    noChatMembers: "D’autres personnes peuvent créer un compte gratuit pour rejoindre.",
    loadingConversations: "Chargement des conversations…", startHere: "Vos conversations commencent ici",
    startHereDescription: "Trouvez un membre inscrit ou créez un groupe avec votre famille, vos amis ou votre équipe.",
    together: "ENSEMBLE, PARTOUT", welcomeHeadline: "De bonnes conversations créent une bonne équipe.",
    welcomeDescription: "Lancez une discussion privée ou réunissez votre famille, vos amis et l’équipe Pharmacy ELAF.",
    findPeople: "Trouver des personnes", writeMessage: "Écrire un message…", sendMessage: "Envoyer le message", attachImage: "Joindre une image",
    removeImage: "Supprimer l’image sélectionnée", composerHint: "Texte ou image jusqu’à 6 Mo · 4 000 caractères maximum",
    profilePhoto: "Changer la photo de profil", uploadingPhoto: "Envoi de la photo…", photoSaved: "Photo de profil mise à jour.",
    photoRemoved: "Photo de profil supprimée.", messageSent: "Message envoyé.", groupCreated: "Groupe créé.",
    chooseImage: "Choisissez une image JPG, PNG, WebP ou GIF.", imageTooLarge: "Les images ne doivent pas dépasser 6 Mo.",
    unsupportedImage: "Le fichier sélectionné n’est pas une image prise en charge.", imageUpload: "Téléverser une photo de profil",
    removePhoto: "Supprimer la photo de profil", photoUploadError: "Impossible de mettre à jour votre photo de profil."
  },
  ar: {
    back: "العودة إلى صيدلية إيلاف ←", privateChat: "صيدلية إيلاف · محادثة خاصة",
    headline: "ابقوا على تواصل أينما كنتم.", authIntro: "أنشئ حساب محادثة مجانيًا للتواصل مع العائلة والأصدقاء وفريق صيدلية إيلاف.",
    signIn: "تسجيل الدخول", createAccount: "إنشاء حساب", fullName: "الاسم الكامل", email: "البريد الإلكتروني",
    password: "كلمة المرور", showPassword: "إظهار كلمة المرور", hidePassword: "إخفاء كلمة المرور",
    pleaseWait: "يرجى الانتظار…", createFreeAccount: "إنشاء حساب مجاني", signInToChat: "تسجيل الدخول للمحادثة",
    authFootnote: "تُجزّأ كلمة المرور قبل تخزينها. استخدم حساب MongoDB نفسه للمحادثة وصيدلية إيلاف؛ وتبقى بيانات المتجر على هذا الجهاز.",
    connecting: "جارٍ الاتصال بالمحادثة…", teamChat: "محادثة الفريق", signOut: "تسجيل الخروج", signOutTitle: "هل تريد تسجيل الخروج من المحادثة؟",
    signOutDescription: "ستحتاج إلى تسجيل الدخول مرة أخرى لعرض المحادثات وإرسال الرسائل على هذا الجهاز.",
    signingOut: "جارٍ تسجيل الخروج…", language: "اللغة",
    accountOptions: "خيارات الحساب", closeModal: "إغلاق النافذة", backToConversations: "العودة إلى المحادثات",
    onlineLabel: "متصل", teamMember: "عضو الفريق", sharedInChat: "صورة مشتركة في المحادثة", selectedPreview: "معاينة الصورة المحددة",
    yourPeople: "جهات اتصالك", startChat: "بدء محادثة", messages: "الرسائل", findPerson: "العثور على شخص",
    closeContacts: "إغلاق جهات الاتصال", newChat: "محادثة جديدة", newGroup: "مجموعة جديدة", searchMembers: "البحث عن أشخاص مسجلين",
    registeredMembers: "أعضاء المحادثة المسجلون", startPrivate: "بدء محادثة خاصة",
    noMembers: "لم يتم العثور على أعضاء.", joinChat: "يمكنهم إنشاء حساب مجاني للانضمام إلى المحادثة.",
    searchChats: "البحث في المحادثات", recent: "الأحدث", privateConversation: "محادثة خاصة",
    onlineNow: "متصل الآن", live: "مباشر", members: "{count} أعضاء", groupMembers: "{count} أعضاء · {online} متصل",
    membersOnly: "الرسائل مرئية لأعضاء المحادثة فقط", loadingMessages: "جارٍ تحميل الرسائل…",
    sayHello: "قل مرحبًا إلى {name}", imagesAppear: "ستظهر رسائلك والصور المشتركة هنا.",
    bringTogether: "اجمع الجميع", createGroup: "إنشاء مجموعة", groupName: "اسم المجموعة",
    groupNamePlaceholder: "العائلة أو الأصدقاء أو فريق صيدلية إيلاف", choosePeople: "اختيار الأشخاص",
    selected: "تم اختيار {count}", createGroupChat: "إنشاء محادثة جماعية", groupRequired: "أضف اسمًا للمجموعة وشخصًا واحدًا على الأقل.",
    noChatMembers: "يمكن للآخرين إنشاء حساب مجاني للانضمام.",
    loadingConversations: "جارٍ تحميل المحادثات…", startHere: "تبدأ محادثاتك هنا",
    startHereDescription: "ابحث عن عضو مسجل أو أنشئ مجموعة مع العائلة أو الأصدقاء أو الفريق.",
    together: "معًا في كل مكان", welcomeHeadline: "المحادثات الجيدة تصنع فريقًا رائعًا.",
    welcomeDescription: "ابدأ محادثة خاصة أو اجمع العائلة والأصدقاء وفريق صيدلية إيلاف في مجموعة.",
    findPeople: "العثور على أشخاص", writeMessage: "اكتب رسالة…", sendMessage: "إرسال الرسالة", attachImage: "إرفاق صورة",
    removeImage: "إزالة الصورة المحددة", composerHint: "شارك نصًا أو صورة حتى 6 ميغابايت · ٤٠٠٠ حرف كحد أقصى",
    profilePhoto: "تغيير صورة الملف الشخصي", uploadingPhoto: "جارٍ رفع الصورة…", photoSaved: "تم تحديث صورة الملف الشخصي.",
    photoRemoved: "تم حذف صورة الملف الشخصي.", messageSent: "تم إرسال الرسالة بنجاح.", groupCreated: "تم إنشاء المجموعة بنجاح.",
    chooseImage: "اختر صورة JPG أو PNG أو WebP أو GIF.", imageTooLarge: "يجب ألا يتجاوز حجم الصور 6 ميغابايت.",
    unsupportedImage: "الملف المحدد صورة غير مدعومة.", imageUpload: "رفع صورة الملف الشخصي",
    removePhoto: "حذف صورة الملف الشخصي", photoUploadError: "تعذر تحديث صورة الملف الشخصي."
  },
  rw: {
    back: "← Subira kuri Pharmacy ELAF", privateChat: "PHARMACY ELAF · IKIGANIRO CYIHARIYE",
    headline: "Mukomeze kuba hafi aho muri hose.", authIntro: "Fungura konti y'ubuntu yo kuganira n'umuryango, inshuti n'itsinda rya Pharmacy ELAF.",
    signIn: "Injira", createAccount: "Fungura konti", fullName: "Amazina yose", email: "Imeyili",
    password: "Ijambo ry'ibanga", showPassword: "Erekana ijambo ry'ibanga", hidePassword: "Hisha ijambo ry'ibanga",
    pleaseWait: "Tegereza…", createFreeAccount: "Fungura konti y'ubuntu", signInToChat: "Injira mu kiganiro",
    authFootnote: "Ijambo ry'ibanga ribikwa nyuma yo guhindurwa mu buryo bwa hash. Koresha konti imwe ya MongoDB kuri chat na Pharmacy ELAF; amakuru y'ububiko aguma kuri iki gikoresho.",
    connecting: "Turahuza n'ikiganiro…", teamChat: "IKIGANIRO CY'ITSINDA", signOut: "Sohoka", signOutTitle: "Ushaka gusohoka mu kiganiro?",
    signOutDescription: "Ugomba kongera kwinjira kugira ngo urebe ibiganiro kandi wohereze ubutumwa kuri iki gikoresho.",
    signingOut: "Turimo gusohoka…", language: "Ururimi",
    accountOptions: "Amahitamo ya konti", closeModal: "Funga idirishya", backToConversations: "Subira ku biganiro",
    onlineLabel: "Ari kuri murandasi", teamMember: "Umunyamuryango w'ikipe", sharedInChat: "Ifoto yasangijwe mu kiganiro", selectedPreview: "Ishusho y'ifoto yatoranyijwe",
    yourPeople: "ABANTU BAWE", startChat: "Tangira ikiganiro", messages: "Ubutumwa", findPerson: "Shaka umuntu",
    closeContacts: "Funga abantu", newChat: "Ikiganiro gishya", newGroup: "Itsinda rishya", searchMembers: "Shaka abantu biyandikishije",
    registeredMembers: "ABANYAMURYANGO BIYANDITSE", startPrivate: "Tangira ikiganiro cyihariye",
    noMembers: "Nta muntu ubonetse.", joinChat: "Bashobora gufungura konti y'ubuntu kugira ngo bifatanye.",
    searchChats: "Shaka ibiganiro", recent: "IBYA VUBA", privateConversation: "Ikiganiro cyihariye",
    onlineNow: "Ari kuri murandasi", live: "Ako kanya", members: "Abantu {count}", groupMembers: "Abantu {count} · {online} bari kuri murandasi",
    membersOnly: "Ubutumwa bubonwa gusa n'abari mu kiganiro", loadingMessages: "Ubutumwa burimo gupakirwa…",
    sayHello: "Suhuza {name}", imagesAppear: "Ubutumwa n'amafoto usangiza bizagaragara hano.",
    bringTogether: "HUZA BOSE", createGroup: "Fungura itsinda", groupName: "Izina ry'itsinda",
    groupNamePlaceholder: "Umuryango, inshuti cyangwa itsinda rya Pharmacy ELAF", choosePeople: "Hitamo abantu",
    selected: "Abatoranyijwe: {count}", createGroupChat: "Fungura ikiganiro cy'itsinda", groupRequired: "Andika izina ry'itsinda hanyuma uhitemo nibura umuntu umwe.",
    noChatMembers: "Abandi bashobora gufungura konti y'ubuntu kugira ngo bifatanye.",
    loadingConversations: "Ibiganiro birimo gupakirwa…", startHere: "Ibiganiro byawe bitangirira hano",
    startHereDescription: "Shaka umuntu wiyandikishije cyangwa ufungure itsinda ry'umuryango, inshuti cyangwa ikipe.",
    together: "HAMWE, AHANTU HOSE", welcomeHeadline: "Ibiganiro byiza bituma ikipe ikomera.",
    welcomeDescription: "Tangira ikiganiro cyihariye cyangwa uhuze umuryango, inshuti n'ikipe ya Pharmacy ELAF.",
    findPeople: "Shaka abantu", writeMessage: "Andika ubutumwa…", sendMessage: "Ohereza ubutumwa", attachImage: "Ongeraho ifoto",
    removeImage: "Kuraho ifoto yatoranyijwe", composerHint: "Sangiza ubutumwa cyangwa ifoto itarengeje 6 MB · inyuguti 4.000",
    profilePhoto: "Hindura ifoto ya konti", uploadingPhoto: "Ifoto irimo koherezwa…", photoSaved: "Ifoto ya konti yahinduwe.",
    photoRemoved: "Ifoto ya konti yakuweho.", messageSent: "Ubutumwa bwoherejwe neza.", groupCreated: "Itsinda ryafunguwe neza.",
    chooseImage: "Hitamo ifoto ya JPG, PNG, WebP cyangwa GIF.", imageTooLarge: "Amafoto ntarenge 6 MB.",
    unsupportedImage: "Iyi dosiye si ifoto yemerewe.", imageUpload: "Ohereza ifoto ya konti",
    removePhoto: "Kuraho ifoto ya konti", photoUploadError: "Ntibyashobotse guhindura ifoto ya konti."
  },
  sw: {
    back: "← Rudi Pharmacy ELAF", privateChat: "PHARMACY ELAF · MAZUNGUMZO BINAFSI",
    headline: "Endeleeni kuwa karibu popote mlipo.", authIntro: "Fungua akaunti ya bure kuzungumza na familia, marafiki na timu ya Pharmacy ELAF.",
    signIn: "Ingia", createAccount: "Fungua akaunti", fullName: "Jina kamili", email: "Barua pepe",
    password: "Nenosiri", showPassword: "Onyesha nenosiri", hidePassword: "Ficha nenosiri",
    pleaseWait: "Tafadhali subiri…", createFreeAccount: "Fungua akaunti ya bure", signInToChat: "Ingia kwenye gumzo",
    authFootnote: "Nenosiri hufanyiwa hash kabla ya kuhifadhiwa. Tumia akaunti ileile ya MongoDB kwa gumzo na Pharmacy ELAF; data ya duka hubaki kwenye kifaa hiki.",
    connecting: "Inaunganisha kwenye gumzo…", teamChat: "GUMZO LA TIMU", signOut: "Toka", signOutTitle: "Uondoke kwenye gumzo?",
    signOutDescription: "Utahitaji kuingia tena ili kuona mazungumzo na kutuma ujumbe kwenye kifaa hiki.",
    signingOut: "Inatoka…", language: "Lugha",
    accountOptions: "Chaguo za akaunti", closeModal: "Funga dirisha", backToConversations: "Rudi kwenye mazungumzo",
    onlineLabel: "Yupo mtandaoni", teamMember: "Mwanatimu", sharedInChat: "Picha iliyoshirikiwa kwenye gumzo", selectedPreview: "Muhtasari wa picha iliyochaguliwa",
    yourPeople: "WATU WAKO", startChat: "Anza gumzo", messages: "Ujumbe", findPerson: "Tafuta mtu",
    closeContacts: "Funga anwani", newChat: "Gumzo jipya", newGroup: "Kikundi kipya", searchMembers: "Tafuta watu waliojisajili",
    registeredMembers: "WANACHAMA WA GUMZO WALIOJISAJILI", startPrivate: "Anza gumzo la faragha",
    noMembers: "Hakuna wanachama waliopatikana.", joinChat: "Wanaweza kufungua akaunti ya bure ili kujiunga.",
    searchChats: "Tafuta mazungumzo", recent: "YA HIVI KARIBUNI", privateConversation: "Mazungumzo ya faragha",
    onlineNow: "Yupo mtandaoni", live: "Moja kwa moja", members: "Wanachama {count}", groupMembers: "Wanachama {count} · {online} mtandaoni",
    membersOnly: "Ujumbe unaonekana kwa wanachama wa mazungumzo pekee", loadingMessages: "Inapakia ujumbe…",
    sayHello: "Msalimie {name}", imagesAppear: "Ujumbe na picha ulizoshiriki zitaonekana hapa.",
    bringTogether: "WAKUSANYE WOTE", createGroup: "Unda kikundi", groupName: "Jina la kikundi",
    groupNamePlaceholder: "Familia, marafiki au timu ya Pharmacy ELAF", choosePeople: "Chagua watu",
    selected: "{count} wamechaguliwa", createGroupChat: "Unda gumzo la kikundi", groupRequired: "Weka jina la kikundi na uchague angalau mtu mmoja.",
    noChatMembers: "Watu wengine wanaweza kufungua akaunti ya bure ili kujiunga.",
    loadingConversations: "Inapakia mazungumzo…", startHere: "Mazungumzo yako yanaanzia hapa",
    startHereDescription: "Tafuta mwanachama aliyejisajili au unda kikundi cha familia, marafiki au timu yako.",
    together: "PAMOJA, POPOTE", welcomeHeadline: "Mazungumzo mazuri huunda timu bora.",
    welcomeDescription: "Anza mazungumzo ya faragha au wakusanye familia, marafiki na timu ya Pharmacy ELAF.",
    findPeople: "Tafuta watu", writeMessage: "Andika ujumbe…", sendMessage: "Tuma ujumbe", attachImage: "Ambatisha picha",
    removeImage: "Ondoa picha iliyochaguliwa", composerHint: "Shiriki maandishi au picha ya hadi MB 6 · herufi 4,000",
    profilePhoto: "Badilisha picha ya wasifu", uploadingPhoto: "Inapakia picha…", photoSaved: "Picha ya wasifu imesasishwa.",
    photoRemoved: "Picha ya wasifu imeondolewa.", messageSent: "Ujumbe umetumwa kikamilifu.", groupCreated: "Kikundi kimeundwa kikamilifu.",
    chooseImage: "Chagua picha ya JPG, PNG, WebP au GIF.", imageTooLarge: "Picha zisiwe zaidi ya MB 6.",
    unsupportedImage: "Faili iliyochaguliwa si picha inayotumika.", imageUpload: "Pakia picha ya wasifu",
    removePhoto: "Ondoa picha ya wasifu", photoUploadError: "Imeshindikana kusasisha picha yako ya wasifu."
  }
};

const featureTranslations = {
  en: {
    filterInbox: "Inbox", filterUnread: "Unread", filterCommunities: "Communities", filterRequests: "Requests", filterSpam: "Spam", filterArchived: "Archived",
    newCommunity: "New community", createCommunity: "Create community", communityDescription: "Description (optional)",
    acceptRequest: "Accept", markSpam: "Move to spam", archiveChat: "Archive", unarchiveChat: "Restore",
    requestNotice: "Accept this message request to reply.", privacySettings: "Privacy settings", presenceVisibility: "Who can see your active status?",
    presenceEveryone: "Everyone", presenceContacts: "People in your chats", presenceNobody: "Nobody", allowRequests: "Allow new message requests",
    saveSettings: "Save settings", saved: "Settings saved.", mediaStorage: "My shared media", noMedia: "No shared media yet.",
    deleteMedia: "Delete media", manageHistory: "Chat history", createBackup: "Create backup", restoreBackup: "Restore",
    deleteBackup: "Delete backup", noBackups: "No backups yet.", backupCreated: "Chat backup created.", backupRestored: "Chat history restored.",
    loadOlderMessages: "Load older messages", marketplace: "Open marketplace", attachMedia: "Attach media",
    recordAudio: "Record audio", recordVideo: "Record video", stopRecording: "Stop recording",
    mediaTooLarge: "Images must be 6 MB or smaller; video and audio must be 12 MB or smaller.",
    backupWarning: "Backups are stored in the same database as chat and cannot recover data if that database is lost.",
    unsupportedMedia: "Choose a supported JPG, PNG, WebP, GIF, MP4, WebM, OGG, MP3, or WAV file.",
    requestPendingNotice: "Your message request is waiting for a response.", communityCreated: "Community created successfully.",
    changePhoto: "Change photo", uploadPhoto: "Upload photo", takePhoto: "Take photo",
    startChatPhotoHint: "Choose a person to start a conversation; Upload Photo and Take Photo are available in the message composer.",
    mediaUsage: "{size} used",
    requestBlockedNotice: "This person is not accepting message requests.",
    markedSpam: "Message request moved to spam.",
    confirmDeleteMedia: "Delete this shared media?", recordingUnsupported: "Recording is not supported by this browser.",
    recordingFailed: "The recording could not be completed.", emptyFilter: "No conversations in this folder.",
    composerHint: "Share text or an image up to 6 MB, or audio/video up to 12 MB · max 4,000 characters"
  },
  fr: {
    filterInbox: "Boîte de réception", filterUnread: "Non lus", filterCommunities: "Communautés", filterRequests: "Demandes", filterSpam: "Indésirables", filterArchived: "Archivées",
    newCommunity: "Nouvelle communauté", createCommunity: "Créer une communauté", communityDescription: "Description (facultative)",
    acceptRequest: "Accepter", markSpam: "Signaler comme indésirable", archiveChat: "Archiver", unarchiveChat: "Restaurer",
    requestNotice: "Acceptez cette demande pour répondre.", privacySettings: "Confidentialité", presenceVisibility: "Qui peut voir votre statut en ligne ?",
    presenceEveryone: "Tout le monde", presenceContacts: "Personnes dans vos discussions", presenceNobody: "Personne", allowRequests: "Autoriser les demandes de discussion",
    saveSettings: "Enregistrer", saved: "Paramètres enregistrés.", mediaStorage: "Mes médias partagés", noMedia: "Aucun média partagé.",
    deleteMedia: "Supprimer le média", manageHistory: "Historique des discussions", createBackup: "Créer une sauvegarde", restoreBackup: "Restaurer",
    deleteBackup: "Supprimer la sauvegarde", noBackups: "Aucune sauvegarde.", backupCreated: "Sauvegarde créée.", backupRestored: "Historique restauré.",
    loadOlderMessages: "Charger les anciens messages", marketplace: "Ouvrir la boutique", attachMedia: "Joindre un média",
    recordAudio: "Enregistrer l’audio", recordVideo: "Enregistrer une vidéo", stopRecording: "Arrêter l’enregistrement",
    mediaTooLarge: "Images : 6 Mo maximum ; audio et vidéo : 12 Mo maximum.",
    backupWarning: "Les sauvegardes sont stockées dans la même base de données et ne récupèrent pas les données en cas de perte de celle-ci.",
    unsupportedMedia: "Choisissez un fichier JPG, PNG, WebP, GIF, MP4, WebM, OGG, MP3 ou WAV pris en charge.",
    requestPendingNotice: "Votre demande de discussion attend une réponse.", communityCreated: "Communauté créée.",
    changePhoto: "Changer la photo", uploadPhoto: "Importer une photo", takePhoto: "Prendre une photo",
    startChatPhotoHint: "Choisissez une personne pour démarrer ; les options Importer une photo et Prendre une photo sont dans le composeur.",
    mediaUsage: "{size} utilisés",
    requestBlockedNotice: "Cette personne n’accepte pas les demandes de discussion.",
    markedSpam: "Demande déplacée dans les indésirables.",
    confirmDeleteMedia: "Supprimer ce média partagé ?", recordingUnsupported: "L’enregistrement n’est pas pris en charge par ce navigateur.",
    recordingFailed: "L’enregistrement a échoué.", emptyFilter: "Aucune discussion dans ce dossier.",
    composerHint: "Texte ou image jusqu’à 6 Mo, audio/vidéo jusqu’à 12 Mo · 4 000 caractères maximum"
  },
  ar: {
    filterInbox: "الوارد", filterUnread: "غير المقروء", filterCommunities: "المجتمعات", filterRequests: "الطلبات", filterSpam: "الرسائل غير المرغوبة", filterArchived: "المؤرشفة",
    newCommunity: "مجتمع جديد", createCommunity: "إنشاء مجتمع", communityDescription: "الوصف (اختياري)",
    acceptRequest: "قبول", markSpam: "نقل إلى غير المرغوب", archiveChat: "أرشفة", unarchiveChat: "استعادة",
    requestNotice: "اقبل طلب الرسالة للرد.", privacySettings: "إعدادات الخصوصية", presenceVisibility: "من يمكنه رؤية حالة اتصالك؟",
    presenceEveryone: "الجميع", presenceContacts: "الأشخاص في محادثاتك", presenceNobody: "لا أحد", allowRequests: "السماح بطلبات المحادثة الجديدة",
    saveSettings: "حفظ الإعدادات", saved: "تم حفظ الإعدادات.", mediaStorage: "وسائطي المشتركة", noMedia: "لا توجد وسائط مشتركة.",
    deleteMedia: "حذف الوسائط", manageHistory: "سجل المحادثة", createBackup: "إنشاء نسخة احتياطية", restoreBackup: "استعادة",
    deleteBackup: "حذف النسخة الاحتياطية", noBackups: "لا توجد نسخ احتياطية.", backupCreated: "تم إنشاء النسخة الاحتياطية.", backupRestored: "تمت استعادة سجل المحادثة.",
    loadOlderMessages: "تحميل الرسائل الأقدم", marketplace: "فتح المتجر", attachMedia: "إرفاق وسائط",
    recordAudio: "تسجيل صوت", recordVideo: "تسجيل فيديو", stopRecording: "إيقاف التسجيل",
    mediaTooLarge: "الصور حتى 6 ميغابايت؛ والصوت والفيديو حتى 12 ميغابايت.",
    backupWarning: "تُحفظ النسخ الاحتياطية في قاعدة البيانات نفسها ولا تستعيد البيانات عند فقدانها.",
    unsupportedMedia: "اختر ملف JPG أو PNG أو WebP أو GIF أو MP4 أو WebM أو OGG أو MP3 أو WAV مدعومًا.",
    requestPendingNotice: "طلب المحادثة بانتظار الرد.", communityCreated: "تم إنشاء المجتمع بنجاح.",
    changePhoto: "تغيير الصورة", uploadPhoto: "رفع صورة", takePhoto: "التقاط صورة",
    startChatPhotoHint: "اختر شخصًا لبدء المحادثة؛ ستجد خياري رفع صورة والتقاط صورة في مربع كتابة الرسالة.",
    mediaUsage: "المستخدم: {size}",
    requestBlockedNotice: "هذا الشخص لا يقبل طلبات المحادثة.",
    markedSpam: "تم نقل طلب الرسالة إلى غير المرغوب.",
    confirmDeleteMedia: "هل تريد حذف هذه الوسائط المشتركة؟", recordingUnsupported: "التسجيل غير مدعوم في هذا المتصفح.",
    recordingFailed: "تعذر إكمال التسجيل.", emptyFilter: "لا توجد محادثات في هذا المجلد.",
    composerHint: "شارك نصًا أو صورة حتى 6 ميغابايت أو صوتًا/فيديو حتى 12 ميغابايت · ٤٠٠٠ حرف كحد أقصى"
  },
  rw: {
    filterInbox: "Ubutumwa", filterUnread: "Butarasomwa", filterCommunities: "Imiryango", filterRequests: "Ibyifuzo", filterSpam: "Ibitifuzwa", filterArchived: "Ibyabitswe",
    newCommunity: "Umuryango mushya", createCommunity: "Fungura umuryango", communityDescription: "Ibisobanuro (ntibisabwa)",
    acceptRequest: "Emera", markSpam: "Shyira mu bitifuzwa", archiveChat: "Bika", unarchiveChat: "Subizaho",
    requestNotice: "Emera ubu butumwa mbere yo gusubiza.", privacySettings: "Igenamiterere ry'ibanga", presenceVisibility: "Ni nde ushobora kubona ko uri kuri murandasi?",
    presenceEveryone: "Bose", presenceContacts: "Abantu musangiye ibiganiro", presenceNobody: "Nta muntu", allowRequests: "Emera ibyifuzo bishya by'ubutumwa",
    saveSettings: "Bika igenamiterere", saved: "Igenamiterere ryabitswe.", mediaStorage: "Amadosiye nasangije", noMedia: "Nta madosiye arasangizwa.",
    deleteMedia: "Siba idosiye", manageHistory: "Amateka y'ibiganiro", createBackup: "Bika kopi", restoreBackup: "Subizaho",
    deleteBackup: "Siba kopi", noBackups: "Nta kopi zirabikwa.", backupCreated: "Kopi y'ikiganiro yabitswe.", backupRestored: "Amateka y'ikiganiro yasubijweho.",
    loadOlderMessages: "Shaka ubutumwa bwa kera", marketplace: "Fungura iduka", attachMedia: "Ongeraho dosiye",
    recordAudio: "Fata amajwi", recordVideo: "Fata amashusho", stopRecording: "Hagarika gufata",
    mediaTooLarge: "Amafoto ntarenge 6 MB; amajwi n'amashusho ntarenge 12 MB.",
    backupWarning: "Kopi zibikwa muri sisitemu imwe n'ibiganiro kandi ntizagarura amakuru iyo sisitemu ibuze.",
    unsupportedMedia: "Hitamo dosiye ya JPG, PNG, WebP, GIF, MP4, WebM, OGG, MP3 cyangwa WAV.",
    requestPendingNotice: "Icyifuzo cyawe kirategereje igisubizo.", communityCreated: "Umuryango wafunguwe neza.",
    changePhoto: "Hindura ifoto", uploadPhoto: "Ohereza ifoto", takePhoto: "Fata ifoto",
    startChatPhotoHint: "Hitamo umuntu utangire ikiganiro; amahitamo yo kohereza cyangwa gufata ifoto ari aho wandikira ubutumwa.",
    mediaUsage: "Byakoreshejwe: {size}",
    requestBlockedNotice: "Uyu muntu ntiyemera ibyifuzo bishya by'ubutumwa.",
    markedSpam: "Ubutumwa bwashyizwe mu bitifuzwa.",
    confirmDeleteMedia: "Ushaka gusiba iyi dosiye yasangijwe?", recordingUnsupported: "Iyi porogaramu ntishobora gufata amajwi cyangwa amashusho.",
    recordingFailed: "Gufata amajwi cyangwa amashusho ntibyagenze neza.", emptyFilter: "Nta biganiro biri muri iri tsinda.",
    composerHint: "Sangiza ubutumwa cyangwa ifoto kugeza kuri 6 MB, amajwi/amashusho kugeza kuri 12 MB · inyuguti 4.000"
  },
  sw: {
    filterInbox: "Kikasha", filterUnread: "Hazijasomwa", filterCommunities: "Jumuiya", filterRequests: "Maombi", filterSpam: "Barua taka", filterArchived: "Yaliyohifadhiwa",
    newCommunity: "Jumuiya mpya", createCommunity: "Unda jumuiya", communityDescription: "Maelezo (si lazima)",
    acceptRequest: "Kubali", markSpam: "Hamisha kwa barua taka", archiveChat: "Hifadhi", unarchiveChat: "Rejesha",
    requestNotice: "Kubali ombi hili ili kujibu.", privacySettings: "Mipangilio ya faragha", presenceVisibility: "Nani anaweza kuona hali yako ya mtandaoni?",
    presenceEveryone: "Kila mtu", presenceContacts: "Watu kwenye mazungumzo yako", presenceNobody: "Hakuna mtu", allowRequests: "Ruhusu maombi mapya ya ujumbe",
    saveSettings: "Hifadhi mipangilio", saved: "Mipangilio imehifadhiwa.", mediaStorage: "Midia niliyoshiriki", noMedia: "Bado hakuna midia iliyoshirikiwa.",
    deleteMedia: "Futa midia", manageHistory: "Historia ya gumzo", createBackup: "Unda nakala", restoreBackup: "Rejesha",
    deleteBackup: "Futa nakala", noBackups: "Bado hakuna nakala.", backupCreated: "Nakala ya gumzo imeundwa.", backupRestored: "Historia ya gumzo imerejeshwa.",
    loadOlderMessages: "Pakia ujumbe wa zamani", marketplace: "Fungua duka", attachMedia: "Ambatisha midia",
    recordAudio: "Rekodi sauti", recordVideo: "Rekodi video", stopRecording: "Simamisha kurekodi",
    mediaTooLarge: "Picha zisizidi MB 6; sauti na video zisizidi MB 12.",
    backupWarning: "Nakala huhifadhiwa kwenye hifadhidata ileile na haziwezi kurejesha data hifadhidata hiyo ikipotea.",
    unsupportedMedia: "Chagua faili inayotumika ya JPG, PNG, WebP, GIF, MP4, WebM, OGG, MP3 au WAV.",
    requestPendingNotice: "Ombi lako la ujumbe linasubiri jibu.", communityCreated: "Jumuiya imeundwa kikamilifu.",
    changePhoto: "Badilisha picha", uploadPhoto: "Pakia picha", takePhoto: "Piga picha",
    startChatPhotoHint: "Chagua mtu uanze mazungumzo; chaguo za kupakia au kupiga picha ziko kwenye sehemu ya kuandika ujumbe.",
    mediaUsage: "Imetumika: {size}",
    requestBlockedNotice: "Mtu huyu hapokei maombi mapya ya ujumbe.",
    markedSpam: "Ombi limehamishwa kwa barua taka.",
    confirmDeleteMedia: "Futa midia hii iliyoshirikiwa?", recordingUnsupported: "Kurekodi hakutumiki kwenye kivinjari hiki.",
    recordingFailed: "Rekodi haikuweza kukamilika.", emptyFilter: "Hakuna mazungumzo kwenye folda hii.",
    composerHint: "Shiriki maandishi/picha hadi MB 6 au sauti/video hadi MB 12 · herufi 4,000"
  }
};

const callTranslations = {
  en: {
    callButton: "Call", callUnavailable: "Calls are available after a direct chat is accepted.",
    voiceCall: "Voice call", videoCall: "Video call", cancelCall: "Cancel", callErrorTitle: "Call",
    callErrorOk: "OK", noAnswerTitle: "No answer",
    outgoingCall: "Calling {name}…", connectingCall: "Connecting call…",
    activeCall: "Audio call with {name}", incomingCall: "Incoming call from {name}",
    videoCallWith: "Video call with {name}", holdCall: "Hold call", resumeCall: "Resume call",
    callOnHold: "Call on hold with {name}", remoteCallOnHold: "{name} put the call on hold",
    callOnHoldLabel: "Call on hold",
    answerCall: "Answer", declineCall: "Decline", endCall: "End call", muteCall: "Mute", unmuteCall: "Unmute",
    cameraOn: "Turn camera on", cameraOff: "Turn camera off", shareScreen: "Share screen",
    stopScreenShare: "Stop sharing", moreCallOptions: "More", speakerOn: "Turn speaker on",
    speakerOff: "Turn speaker off", youLabel: "You", cameraUnavailable: "Camera unavailable; continuing with voice only.",
    screenSharing: "Sharing screen", screenShareUnsupported: "Screen sharing is not supported in this browser.",
    screenShareFailed: "Couldn't share your screen. Check browser permissions and try again.",
    voiceCallNoAnswer: "Your voice call to {name} was not answered.",
    videoCallNoAnswer: "Your video call to {name} was not answered.",
    missedVoiceCall: "Missed voice call from {name}.", missedVideoCall: "Missed video call from {name}.",
    callDeclined: "Call declined.", callEnded: "Call ended.",
    callUnsupported: "Audio calls are not supported in this browser.",
    callMicError: "Allow microphone access to place or answer calls.", callAudioPlayback: "Use the audio player to start playback.",
    callFailed: "Couldn't place call. Make sure your device has an internet connection and try again."
  },
  fr: {
    callButton: "Appeler", callUnavailable: "Les appels sont disponibles après l’acceptation d’une discussion directe.",
    voiceCall: "Appel vocal", videoCall: "Appel vidéo", cancelCall: "Annuler", callErrorTitle: "Appel",
    callErrorOk: "OK", noAnswerTitle: "Sans réponse",
    outgoingCall: "Appel de {name}…", connectingCall: "Connexion de l’appel…",
    activeCall: "Appel audio avec {name}", incomingCall: "Appel entrant de {name}",
    videoCallWith: "Appel vidéo avec {name}", holdCall: "Mettre en attente", resumeCall: "Reprendre l’appel",
    callOnHold: "Appel en attente avec {name}", remoteCallOnHold: "{name} a mis l’appel en attente",
    callOnHoldLabel: "Appel en attente",
    answerCall: "Répondre", declineCall: "Refuser", endCall: "Terminer l’appel", muteCall: "Couper le micro", unmuteCall: "Activer le micro",
    cameraOn: "Activer la caméra", cameraOff: "Désactiver la caméra", shareScreen: "Partager l’écran",
    stopScreenShare: "Arrêter le partage", moreCallOptions: "Plus", speakerOn: "Activer le haut-parleur",
    speakerOff: "Désactiver le haut-parleur", youLabel: "Vous", cameraUnavailable: "Caméra indisponible ; l’appel continue en audio uniquement.",
    screenSharing: "Partage d’écran", screenShareUnsupported: "Le partage d’écran n’est pas pris en charge par ce navigateur.",
    screenShareFailed: "Impossible de partager l’écran. Vérifiez les autorisations du navigateur et réessayez.",
    voiceCallNoAnswer: "Votre appel vocal à {name} est resté sans réponse.",
    videoCallNoAnswer: "Votre appel vidéo à {name} est resté sans réponse.",
    missedVoiceCall: "Appel vocal manqué de {name}.", missedVideoCall: "Appel vidéo manqué de {name}.",
    callDeclined: "Appel refusé.", callEnded: "Appel terminé.",
    callUnsupported: "Les appels audio ne sont pas pris en charge par ce navigateur.",
    callMicError: "Autorisez l’accès au microphone pour appeler ou répondre.", callAudioPlayback: "Utilisez le lecteur audio pour démarrer la lecture.",
    callFailed: "Impossible de passer l’appel. Vérifiez votre connexion Internet et réessayez."
  },
  ar: {
    callButton: "اتصال", callUnavailable: "تتوفر المكالمات بعد قبول المحادثة المباشرة.",
    voiceCall: "مكالمة صوتية", videoCall: "مكالمة فيديو", cancelCall: "إلغاء", callErrorTitle: "مكالمة",
    callErrorOk: "حسنًا", noAnswerTitle: "لا يوجد رد",
    outgoingCall: "جارٍ الاتصال بـ {name}…", connectingCall: "جارٍ توصيل المكالمة…",
    activeCall: "مكالمة صوتية مع {name}", incomingCall: "مكالمة واردة من {name}",
    videoCallWith: "مكالمة فيديو مع {name}", holdCall: "تعليق المكالمة", resumeCall: "استئناف المكالمة",
    callOnHold: "المكالمة معلقة مع {name}", remoteCallOnHold: "علّق {name} المكالمة",
    callOnHoldLabel: "المكالمة قيد الانتظار",
    answerCall: "رد", declineCall: "رفض", endCall: "إنهاء المكالمة", muteCall: "كتم الصوت", unmuteCall: "تشغيل الصوت",
    cameraOn: "تشغيل الكاميرا", cameraOff: "إيقاف الكاميرا", shareScreen: "مشاركة الشاشة",
    stopScreenShare: "إيقاف المشاركة", moreCallOptions: "المزيد", speakerOn: "تشغيل مكبر الصوت",
    speakerOff: "كتم مكبر الصوت", youLabel: "أنت", cameraUnavailable: "الكاميرا غير متاحة؛ ستستمر المكالمة صوتيًا فقط.",
    screenSharing: "مشاركة الشاشة", screenShareUnsupported: "مشاركة الشاشة غير مدعومة في هذا المتصفح.",
    screenShareFailed: "تعذرت مشاركة الشاشة. تحقق من أذونات المتصفح وحاول مرة أخرى.",
    voiceCallNoAnswer: "لم يتم الرد على مكالمتك الصوتية إلى {name}.",
    videoCallNoAnswer: "لم يتم الرد على مكالمة الفيديو إلى {name}.",
    missedVoiceCall: "فاتتك مكالمة صوتية من {name}.", missedVideoCall: "فاتتك مكالمة فيديو من {name}.",
    callDeclined: "تم رفض المكالمة.", callEnded: "انتهت المكالمة.",
    callUnsupported: "المكالمات الصوتية غير مدعومة في هذا المتصفح.",
    callMicError: "اسمح باستخدام الميكروفون لإجراء المكالمات أو الرد عليها.", callAudioPlayback: "استخدم مشغل الصوت لبدء التشغيل.",
    callFailed: "تعذر إجراء المكالمة. تأكد من اتصال جهازك بالإنترنت ثم حاول مرة أخرى."
  },
  rw: {
    callButton: "Hamagara", callUnavailable: "Ushobora guhamagara ikiganiro cyihariye kimaze kwemezwa.",
    voiceCall: "Ihamagarwa ry'amajwi", videoCall: "Ihamagarwa rya videwo", cancelCall: "Hagarika", callErrorTitle: "Ihamagarwa",
    callErrorOk: "Sawa", noAnswerTitle: "Nta gisubizo",
    outgoingCall: "Turahamagara {name}…", connectingCall: "Turahuza ikiganiro…",
    activeCall: "Ikiganiro cy'amajwi na {name}", incomingCall: "Ihamagarwa riturutse kuri {name}",
    videoCallWith: "Ikiganiro cya videwo na {name}", holdCall: "Shyira ku murongo utegereje", resumeCall: "Komeza ikiganiro",
    callOnHold: "Ikiganiro na {name} kiri ku murongo utegereje", remoteCallOnHold: "{name} yashyize ikiganiro ku murongo utegereje",
    callOnHoldLabel: "Ikiganiro kiri ku murongo utegereje",
    answerCall: "Subiza", declineCall: "Anga", endCall: "Hagarika ikiganiro", muteCall: "Zimya ijwi", unmuteCall: "Fungura ijwi",
    cameraOn: "Fungura kamera", cameraOff: "Zimya kamera", shareScreen: "Sangiza ecran",
    stopScreenShare: "Hagarika gusangiza", moreCallOptions: "Ibindi", speakerOn: "Fungura indangururamajwi",
    speakerOff: "Zimya indangururamajwi", youLabel: "Wowe", cameraUnavailable: "Kamera ntiboneka; ikiganiro kirakomeza mu majwi gusa.",
    screenSharing: "Gusangiza ecran", screenShareUnsupported: "Iyi porogaramu ntishyigikira gusangiza ecran.",
    screenShareFailed: "Ntibyashobotse gusangiza ecran. Reba uburenganzira bwa porogaramu wongere ugerageze.",
    voiceCallNoAnswer: "Umuhamagaro wawe w'amajwi kuri {name} ntiwasubijwe.",
    videoCallNoAnswer: "Umuhamagaro wawe wa videwo kuri {name} ntiwasubijwe.",
    missedVoiceCall: "Wasibye guhamagara mu majwi kwa {name}.", missedVideoCall: "Wasibye guhamagara kuri videwo kwa {name}.",
    callDeclined: "Umuhamagaro wanze.", callEnded: "Ikiganiro kirangiye.",
    callUnsupported: "Iyi porogaramu ntishyigikira guhamagara mu majwi.",
    callMicError: "Emera gukoresha mikoro kugira ngo uhamagare cyangwa usubize.", callAudioPlayback: "Koresha igikoresho cy'amajwi kugira ngo utangize kumva.",
    callFailed: "Ntibyashobotse guhamagara. Reba niba igikoresho cyawe gifite interineti wongere ugerageze."
  },
  sw: {
    callButton: "Piga simu", callUnavailable: "Simu zinapatikana baada ya gumzo la moja kwa moja kukubaliwa.",
    voiceCall: "Simu ya sauti", videoCall: "Simu ya video", cancelCall: "Ghairi", callErrorTitle: "Simu",
    callErrorOk: "Sawa", noAnswerTitle: "Hakuna aliyejibu",
    outgoingCall: "Inapiga {name}…", connectingCall: "Inaunganisha simu…",
    activeCall: "Simu ya sauti na {name}", incomingCall: "Simu inayoingia kutoka kwa {name}",
    videoCallWith: "Simu ya video na {name}", holdCall: "Weka simu kwenye kusubiri", resumeCall: "Endelea na simu",
    callOnHold: "Simu na {name} imesitishwa kwa muda", remoteCallOnHold: "{name} amesitisha simu kwa muda",
    callOnHoldLabel: "Simu imesitishwa kwa muda",
    answerCall: "Jibu", declineCall: "Kataa", endCall: "Maliza simu", muteCall: "Zima maikrofoni", unmuteCall: "Washa maikrofoni",
    cameraOn: "Washa kamera", cameraOff: "Zima kamera", shareScreen: "Shiriki skrini",
    stopScreenShare: "Acha kushiriki", moreCallOptions: "Zaidi", speakerOn: "Washa spika",
    speakerOff: "Zima spika", youLabel: "Wewe", cameraUnavailable: "Kamera haipatikani; simu itaendelea kwa sauti pekee.",
    screenSharing: "Inashiriki skrini", screenShareUnsupported: "Kivinjari hiki hakitumii kushiriki skrini.",
    screenShareFailed: "Imeshindwa kushiriki skrini. Hakikisha ruhusa za kivinjari kisha ujaribu tena.",
    voiceCallNoAnswer: "Simu yako ya sauti kwa {name} haikujibiwa.",
    videoCallNoAnswer: "Simu yako ya video kwa {name} haikujibiwa.",
    missedVoiceCall: "Umekosa simu ya sauti kutoka kwa {name}.", missedVideoCall: "Umekosa simu ya video kutoka kwa {name}.",
    callDeclined: "Simu imekataliwa.", callEnded: "Simu imeisha.",
    callUnsupported: "Simu za sauti hazitumiki kwenye kivinjari hiki.",
    callMicError: "Ruhusu ufikiaji wa maikrofoni ili kupiga au kujibu simu.", callAudioPlayback: "Tumia kicheza sauti kuanza kusikiliza.",
    callFailed: "Imeshindwa kupiga simu. Hakikisha kifaa chako kina intaneti kisha ujaribu tena."
  }
};

function canCallConversation(conversation) {
  return conversation?.kind === "direct"
    && !conversation.isRequest
    && !conversation.requestSent
    && !conversation.isSpam
    && !conversation.requestBlocked
    && Boolean(conversation.otherMember?.user_id);
}

const messageTranslations = {
  en: {
    savedMessages: "Saved messages", noSavedMessages: "You haven't saved any messages yet.",
    saveMessage: "Save message", unsaveMessage: "Remove from saved", editMessage: "Edit",
    deleteMessage: "Delete", deleteForMe: "Delete for me", deleteForEveryone: "Delete for everyone",
    deleteMessageTitle: "Delete message?", deleteMessageDescriptionOwn: "Remove it only for you, or delete it for everyone. Deleting for everyone can't be undone.",
    deleteMessageDescriptionOther: "This removes the message only from your chat.",
    saveChanges: "Save changes", cancel: "Cancel",
    edited: "Edited", deletedMessage: "This message was deleted.",
    messageUpdated: "Message updated.", messageDeleted: "Message deleted for everyone.", messageDeletedForMe: "Message deleted for you.",
    messageSaved: "Message saved.", messageUnsaved: "Removed from saved messages.",
    reactToMessage: "React", openConversation: "Open conversation",
    shareOnWhatsApp: "Share to WhatsApp",
    searchReactions: "Search emoji",
    imageAttachment: "Photo", videoAttachment: "Video", audioAttachment: "Audio"
  },
  fr: {
    savedMessages: "Messages enregistrés", noSavedMessages: "Vous n’avez pas encore enregistré de messages.",
    saveMessage: "Enregistrer", unsaveMessage: "Retirer des messages enregistrés", editMessage: "Modifier",
    deleteMessage: "Supprimer", deleteForMe: "Supprimer pour moi", deleteForEveryone: "Supprimer pour tout le monde",
    deleteMessageTitle: "Supprimer le message ?", deleteMessageDescriptionOwn: "Supprimez-le uniquement pour vous ou pour tout le monde. La suppression pour tout le monde est irréversible.",
    deleteMessageDescriptionOther: "Le message sera supprimé uniquement de votre discussion.",
    saveChanges: "Enregistrer les modifications", cancel: "Annuler",
    edited: "Modifié", deletedMessage: "Ce message a été supprimé.",
    messageUpdated: "Message modifié.", messageDeleted: "Message supprimé pour tout le monde.", messageDeletedForMe: "Message supprimé pour vous.",
    messageSaved: "Message enregistré.", messageUnsaved: "Message retiré des éléments enregistrés.",
    reactToMessage: "Réagir", openConversation: "Ouvrir la discussion",
    shareOnWhatsApp: "Partager sur WhatsApp",
    searchReactions: "Rechercher un emoji",
    imageAttachment: "Photo", videoAttachment: "Vidéo", audioAttachment: "Audio"
  },
  ar: {
    savedMessages: "الرسائل المحفوظة", noSavedMessages: "لم تحفظ أي رسائل بعد.",
    saveMessage: "حفظ الرسالة", unsaveMessage: "إزالة من المحفوظات", editMessage: "تعديل",
    deleteMessage: "حذف", deleteForMe: "حذف لدي فقط", deleteForEveryone: "حذف لدى الجميع",
    deleteMessageTitle: "هل تريد حذف الرسالة؟", deleteMessageDescriptionOwn: "احذفها لديك فقط أو لدى الجميع. لا يمكن التراجع عن الحذف لدى الجميع.",
    deleteMessageDescriptionOther: "سيتم حذف الرسالة من محادثتك فقط.",
    saveChanges: "حفظ التعديلات", cancel: "إلغاء",
    edited: "تم التعديل", deletedMessage: "تم حذف هذه الرسالة.",
    messageUpdated: "تم تحديث الرسالة.", messageDeleted: "تم حذف الرسالة لدى الجميع.", messageDeletedForMe: "تم حذف الرسالة لديك.",
    messageSaved: "تم حفظ الرسالة.", messageUnsaved: "تمت إزالة الرسالة من المحفوظات.",
    reactToMessage: "تفاعل", openConversation: "فتح المحادثة",
    shareOnWhatsApp: "مشاركة عبر واتساب",
    searchReactions: "ابحث عن رمز تعبيري",
    imageAttachment: "صورة", videoAttachment: "فيديو", audioAttachment: "صوت"
  },
  rw: {
    savedMessages: "Ubutumwa bwabitswe", noSavedMessages: "Nta butumwa urabika.",
    saveMessage: "Bika ubutumwa", unsaveMessage: "Kuramo mu bubitswe", editMessage: "Hindura",
    deleteMessage: "Siba ubutumwa", deleteForMe: "Siba kuri njye", deleteForEveryone: "Siba kuri bose",
    deleteMessageTitle: "Ushaka gusiba ubutumwa?", deleteMessageDescriptionOwn: "Busibe kuri wowe gusa cyangwa kuri bose. Gusiba kuri bose ntibishobora gusubizwa inyuma.",
    deleteMessageDescriptionOther: "Ubutumwa buzakurwa mu kiganiro cyawe gusa.",
    saveChanges: "Bika ibyahinduwe", cancel: "Hagarika",
    edited: "Byahinduwe", deletedMessage: "Ubu butumwa bwasibwe.",
    messageUpdated: "Ubutumwa bwahinduwe.", messageDeleted: "Ubutumwa bwasibiwe abantu bose.", messageDeletedForMe: "Ubutumwa bwagusibiwe.",
    messageSaved: "Ubutumwa bwabitswe.", messageUnsaved: "Ubutumwa bwakuwe mu bubitswe.",
    reactToMessage: "Garagaza uko ubyumva", openConversation: "Fungura ikiganiro",
    shareOnWhatsApp: "Sangiza kuri WhatsApp",
    searchReactions: "Shaka akamenyetso k'amarangamutima",
    imageAttachment: "Ifoto", videoAttachment: "Video", audioAttachment: "Amajwi"
  },
  sw: {
    savedMessages: "Ujumbe uliohifadhiwa", noSavedMessages: "Bado hujahifadhi ujumbe wowote.",
    saveMessage: "Hifadhi ujumbe", unsaveMessage: "Ondoa kwenye zilizohifadhiwa", editMessage: "Hariri",
    deleteMessage: "Futa ujumbe", deleteForMe: "Nifutie", deleteForEveryone: "Futa kwa kila mtu",
    deleteMessageTitle: "Ungependa kufuta ujumbe?", deleteMessageDescriptionOwn: "Ufute kwako pekee au kwa kila mtu. Kufuta kwa kila mtu hakuwezi kutenduliwa.",
    deleteMessageDescriptionOther: "Ujumbe huu utaondolewa kwenye mazungumzo yako pekee.",
    saveChanges: "Hifadhi mabadiliko", cancel: "Ghairi",
    edited: "Imehaririwa", deletedMessage: "Ujumbe huu umefutwa.",
    messageUpdated: "Ujumbe umesasishwa.", messageDeleted: "Ujumbe umefutwa kwa kila mtu.", messageDeletedForMe: "Ujumbe umefutwa kwako.",
    messageSaved: "Ujumbe umehifadhiwa.", messageUnsaved: "Ujumbe umeondolewa kwenye zilizohifadhiwa.",
    reactToMessage: "Jibu kwa hisia", openConversation: "Fungua mazungumzo",
    shareOnWhatsApp: "Shiriki kwenye WhatsApp",
    searchReactions: "Tafuta emoji",
    imageAttachment: "Picha", videoAttachment: "Video", audioAttachment: "Sauti"
  }
};

const displayTranslations = {
  en: {
    displaySettings: "Display & color", displayBrightness: "Chat page brightness",
    accentColor: "Accent color", displayPageNote: "Changes this chat page only; your device brightness is unchanged.",
    resetDisplay: "Reset display settings"
  },
  fr: {
    displaySettings: "Affichage et couleur", displayBrightness: "Luminosité de la page",
    accentColor: "Couleur d’accentuation", displayPageNote: "Modifie uniquement cette page ; la luminosité de l’appareil ne change pas.",
    resetDisplay: "Réinitialiser l’affichage"
  },
  ar: {
    displaySettings: "العرض والألوان", displayBrightness: "سطوع صفحة المحادثة",
    accentColor: "اللون البارز", displayPageNote: "يغيّر صفحة المحادثة فقط ولا يغيّر سطوع الجهاز.",
    resetDisplay: "إعادة ضبط إعدادات العرض"
  },
  rw: {
    displaySettings: "Imigaragarire n'amabara", displayBrightness: "Urumuri rw'urupapuro rw'ikiganiro",
    accentColor: "Ibara ry'ingenzi", displayPageNote: "Ibi bihindura uru rupapuro gusa; urumuri rw'igikoresho ntiruhinduka.",
    resetDisplay: "Subiza imigaragarire uko yari"
  },
  sw: {
    displaySettings: "Mwonekano na rangi", displayBrightness: "Mwangaza wa ukurasa wa gumzo",
    accentColor: "Rangi ya msisitizo", displayPageNote: "Hii hubadilisha ukurasa huu tu; mwangaza wa kifaa haubadiliki.",
    resetDisplay: "Rejesha mipangilio ya mwonekano"
  }
};

function translate(language, key) {
  return callTranslations[language]?.[key] || messageTranslations[language]?.[key] || displayTranslations[language]?.[key] || featureTranslations[language]?.[key] || chatTranslations[language]?.[key]
    || callTranslations.en[key]
    || messageTranslations.en[key]
    || displayTranslations.en[key]
    || featureTranslations.en[key] || chatTranslations.en[key];
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** unit)).toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function subscribeToLanguage(onChange) {
  window.addEventListener("storage", onChange);
  window.addEventListener("pharmacy-chat-language", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("pharmacy-chat-language", onChange);
  };
}

function getStoredLanguage() {
  const savedLanguage = localStorage.getItem(languageStorageKey);
  return chatTranslations[savedLanguage] ? savedLanguage : "en";
}

function getServerLanguage() {
  return "en";
}

function LanguageSelect({ language, onChange }) {
  return (
    <label className="chat-language-picker">
      <span className="chat-visually-hidden">{translate(language, "language")}</span>
      <select aria-label={translate(language, "language")} value={language} onChange={(event) => onChange(event.target.value)}>
        <option value="en">English</option>
        <option value="fr">Français</option>
        <option value="ar">العربية</option>
        <option value="rw">Kinyarwanda</option>
        <option value="sw">Kiswahili</option>
      </select>
    </label>
  );
}

async function chatRequest(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || "The chat request failed.");
    error.status = response.status;
    throw error;
  }
  return result;
}

function emitSocketAck(socket, eventName, payload, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("The call server did not respond.")), timeoutMs);
    socket.emit(eventName, payload, (result) => {
      clearTimeout(timeout);
      if (result?.error) reject(new Error(result.error));
      else resolve(result);
    });
  });
}

function getErrorMessage(error) {
  return error?.message || "Something went wrong. Please try again.";
}

function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "?";
}

function Avatar({ profile, group = false, small = false }) {
  if (group) {
    return <span className={`chat-avatar chat-avatar-group${small ? " chat-avatar-small" : ""}`} aria-hidden="true">👥</span>;
  }
  if (profile?.avatar_url) {
    return <Image className={`chat-avatar${small ? " chat-avatar-small" : ""}`} src={profile.avatar_url} alt="" width={small ? 34 : 43} height={small ? 34 : 43} unoptimized />;
  }
  return (
    <span className={`chat-avatar chat-avatar-initials${small ? " chat-avatar-small" : ""}`} aria-hidden="true">
      {getInitials(profile?.display_name)}
    </span>
  );
}

function MessageReactionControls({ message, onReact, onOpen, text, disabled = false }) {
  return (
    <div className="chat-message-reactions">
      {message.reactions.map((reaction) => (
        <button
          type="button"
          className={`chat-reaction${reaction.reacted ? " selected" : ""}`}
          key={reaction.emoji}
          onClick={() => onReact(message, reaction.emoji)}
          disabled={disabled}
          aria-label={`${text("reactToMessage")} ${reaction.emoji} ${reaction.count}`}
          aria-pressed={reaction.reacted}
        >
          {reaction.emoji} {reaction.count}
        </button>
      ))}
      <button
        type="button"
        className="chat-message-action chat-message-react"
        onClick={() => onOpen(message)}
        disabled={disabled}
        aria-label={text("reactToMessage")}
        aria-haspopup="dialog"
        title={text("reactToMessage")}
      >
        ☺
      </button>
    </div>
  );
}

function mapMessage(message) {
  return {
    id: message.id,
    conversation_id: message.conversationId,
    conversation_title: message.conversationTitle,
    sender_id: message.senderId,
    body: message.body,
    imageUrl: message.imageUrl,
    mediaUrl: message.mediaUrl,
    mediaType: message.mediaType,
    mediaName: message.mediaName,
    is_saved: Boolean(message.isSaved),
    is_deleted: Boolean(message.deleted),
    edited: Boolean(message.edited),
    reactions: message.reactions || [],
    created_at: message.createdAt,
    sender: message.sender ? { display_name: message.sender.displayName } : null,
  };
}

async function fetchConversations(userId) {
  const { conversations } = await chatRequest("/api/chat/conversations");
  return conversations.map((conversation) => {
    const members = conversation.members.map((member) => ({
      user_id: member.id,
      profile: { id: member.id, display_name: member.displayName, avatar_url: member.avatarUrl },
    }));
    const otherMember = members.find((member) => member.user_id !== userId);
    return {
      ...conversation,
      members,
      displayTitle: conversation.kind !== "direct" ? conversation.title : otherMember?.profile?.display_name || "Direct chat",
      otherMember,
    };
  });
}

function AuthPanel({ language, onLanguageChange }) {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const text = (key) => translate(language, key);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register" && password.length < 8) {
        throw new Error("Use a password with at least 8 characters.");
      }
      await chatRequest(`/api/chat/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, fullName: fullName.trim() }),
      });
      window.location.reload();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="chat-auth-page relative isolate flex min-h-screen flex-col items-center justify-center gap-6 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <div className="chat-auth-toolbar relative z-10 flex w-full max-w-6xl items-center justify-between gap-4">
        <Link className="chat-back-link" href="/">{text("back")}</Link>
        <LanguageSelect language={language} onChange={onLanguageChange} />
      </div>
      <div className="chat-auth-layout relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-2xl backdrop-blur-xl md:min-h-[620px] md:grid-cols-[1.05fr_.95fr]">
        <aside className="chat-auth-showcase relative flex min-h-[230px] flex-col justify-between p-6 text-white sm:min-h-[260px] sm:p-10 md:min-h-full md:p-12">
          <div className="chat-auth-brand relative z-10 flex items-center gap-3">
            <div className="chat-brand-mark">✚</div>
            <span><strong>Pharmacy ELAF</strong><small>{text("teamChat")}</small></span>
          </div>
          <div className="chat-auth-showcase-copy relative z-10 mt-8 max-w-md md:mt-14">
            <p className="chat-auth-showcase-kicker">{text("privateChat")}</p>
            <h1 className="mt-4 max-w-lg text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">{text("headline")}</h1>
            <p className="mt-4 max-w-sm text-sm leading-7 text-emerald-50/90">{text("authIntro")}</p>
          </div>
          <p className="chat-auth-trust relative z-10 mt-7">{text("membersOnly")}</p>
          <div className="chat-auth-art hidden md:block" aria-hidden="true">
            <span className="chat-auth-art-orbit chat-auth-art-orbit-one" />
            <span className="chat-auth-art-orbit chat-auth-art-orbit-two" />
            <span className="chat-auth-art-cross">✚</span>
            <span className="chat-auth-art-bubble">•••</span>
          </div>
        </aside>
        <section className="chat-auth-card relative flex w-full flex-col justify-center p-6 sm:p-10 md:p-12">
          <p className="chat-eyebrow">{text("privateChat")}</p>
          <h2 className="chat-auth-form-title mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{mode === "register" ? text("createAccount") : text("signIn")}</h2>
          <div className="chat-auth-tabs" role="tablist" aria-label={text("accountOptions")}>
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "selected" : ""} onClick={() => { setMode("login"); setError(""); }}>{text("signIn")}</button>
            <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "selected" : ""} onClick={() => { setMode("register"); setError(""); }}>{text("createAccount")}</button>
          </div>
          <form className="chat-auth-form" onSubmit={submit}>
            {mode === "register" && (
            <label>
              {text("fullName")}
              <input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required maxLength={80} />
            </label>
            )}
            <label>
              {text("email")}
              <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              {text("password")}
              <span className="chat-password-field">
                <input id="chat-password" type={showPassword ? "text" : "password"} autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
                <button type="button" className="chat-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={text(showPassword ? "hidePassword" : "showPassword")} aria-pressed={showPassword} aria-controls="chat-password" title={text(showPassword ? "hidePassword" : "showPassword")}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    {showPassword
                      ? <><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 002.8 2.8" /><path d="M9.9 5.2A10.7 10.7 0 0112 5c5.2 0 8.5 5.2 8.5 7a8.6 8.6 0 01-2.2 3.2" /><path d="M6.2 6.2C3.9 7.6 2 10.2 2 12c0 1.8 3.3 7 10 7a10.2 10.2 0 004.1-.8" /></>
                      : <><path d="M2 12s3.3-7 10-7 10 7 10 7-3.3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>}
                  </svg>
                </button>
              </span>
            </label>
            {error && <p className="chat-alert chat-alert-error" role="alert">{error}</p>}
            <button className="chat-primary-button chat-auth-submit" type="submit" disabled={busy}>
              {busy ? text("pleaseWait") : mode === "register" ? text("createFreeAccount") : text("signInToChat")}
            </button>
          </form>
          <p className="chat-auth-footnote">{text("authFootnote")}</p>
        </section>
      </div>
    </main>
  );
}

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const language = useSyncExternalStore(subscribeToLanguage, getStoredLanguage, getServerLanguage);
  const displayPreferencesSnapshot = useSyncExternalStore(
    subscribeToDisplayPreferences,
    getStoredDisplayPreferences,
    getServerDisplayPreferences,
  );
  const displayPreferences = JSON.parse(displayPreferencesSnapshot);
  const [authLoading, setAuthLoading] = useState(true);
  const [directory, setDirectory] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [conversationFilter, setConversationFilter] = useState("inbox");
  const [activeConversationId, setActiveConversationId] = useState("");
  const [messageState, setMessageState] = useState({ conversationId: "", items: [], hasMore: false, cursor: "" });
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [profilePhotoDialogOpen, setProfilePhotoDialogOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [pageError, setPageError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupKind, setGroupKind] = useState("group");
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({ presenceVisibility: "everyone", allowMessageRequests: true });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaBytes, setMediaBytes] = useState(0);
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedMessages, setSavedMessages] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedHasMore, setSavedHasMore] = useState(false);
  const [savedCursor, setSavedCursor] = useState("");
  const [savedRefreshKey, setSavedRefreshKey] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [backups, setBackups] = useState([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [recordingType, setRecordingType] = useState("");
  const [callState, setCallState] = useState("idle");
  const [callDetails, setCallDetails] = useState(null);
  const [callError, setCallError] = useState("");
  const [callOutcome, setCallOutcome] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callMuted, setCallMuted] = useState(false);
  const [callSpeakerMuted, setCallSpeakerMuted] = useState(false);
  const [callHeld, setCallHeld] = useState(false);
  const [callVideoSupported, setCallVideoSupported] = useState(false);
  const [callCameraAvailable, setCallCameraAvailable] = useState(false);
  const [callCameraEnabled, setCallCameraEnabled] = useState(false);
  const [callScreenSharing, setCallScreenSharing] = useState(false);
  const [remoteCallMedia, setRemoteCallMedia] = useState({ cameraEnabled: false, sharingScreen: false, onHold: false });
  const [callMoreOpen, setCallMoreOpen] = useState(false);
  const [callIceServers, setCallIceServers] = useState([{ urls: "stun:stun.l.google.com:19302" }]);
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingMessageDraft, setEditingMessageDraft] = useState("");
  const [messageActionBusy, setMessageActionBusy] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reactionTarget, setReactionTarget] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [mobileListOpen, setMobileListOpen] = useState(true);
  const messageEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const photoUploadInputRef = useRef(null);
  const photoCaptureInputRef = useRef(null);
  const profilePhotoInputRef = useRef(null);
  const profilePhotoCaptureInputRef = useRef(null);
  const recorderRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const callPeerRef = useRef(null);
  const callLocalStreamRef = useRef(null);
  const remoteCallStreamRef = useRef(null);
  const callVideoSenderRef = useRef(null);
  const callHeldRef = useRef(false);
  const screenShareStreamRef = useRef(null);
  const callContextRef = useRef(null);
  const incomingCallRef = useRef(null);
  const remoteIceCandidatesRef = useRef([]);
  const localIceCandidatesRef = useRef([]);
  const callSignalingReadyRef = useRef(false);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const cleanupCallRef = useRef(() => {});
  const hangUpCallRef = useRef(() => {});
  const preserveMessageScrollRef = useRef(false);
  const socketRef = useRef(null);
  const activeConversationRef = useRef("");
  const languageRef = useRef(language);

  const userId = user?.id || "";
  const ownName = user?.displayName || "Pharmacy ELAF member";
  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || null,
    [conversations, activeConversationId],
  );
  const messages = useMemo(
    () => (messageState.conversationId === activeConversationId ? messageState.items : []),
    [messageState, activeConversationId],
  );
  const filteredConversations = useMemo(() => {
    const query = directoryQuery.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (!conversation.displayTitle.toLowerCase().includes(query)) return false;
      if (conversationFilter === "requests") return conversation.isRequest;
      if (conversationFilter === "spam") return conversation.isSpam;
      if (conversationFilter === "archived") return conversation.isArchived;
      if (conversation.isArchived || conversation.isSpam || conversation.isRequest) return false;
      if (conversationFilter === "unread") return conversation.unreadCount > 0;
      if (conversationFilter === "communities") return conversation.kind === "community";
      return true;
    });
  }, [conversations, conversationFilter, directoryQuery]);
  const loadingMessages = Boolean(activeConversationId && messageState.conversationId !== activeConversationId && !pageError);
  const filteredDirectory = useMemo(() => {
    const query = directoryQuery.trim().toLowerCase();
    return directory.filter((profile) => profile.display_name.toLowerCase().includes(query));
  }, [directory, directoryQuery]);
  const text = (key) => translate(language, key);

  function setDisplayPreferences(nextPreferences) {
    const updated = typeof nextPreferences === "function"
      ? nextPreferences(displayPreferences)
      : nextPreferences;
    localStorage.setItem(displayBrightnessStorageKey, String(updated.brightness));
    localStorage.setItem(displayAccentStorageKey, updated.accentColor);
    window.dispatchEvent(new Event(displayPreferencesEvent));
  }

  function changeLanguage(nextLanguage) {
    if (!chatTranslations[nextLanguage]) return;
    localStorage.setItem(languageStorageKey, nextLanguage);
    window.dispatchEvent(new Event("pharmacy-chat-language"));
  }

  useEffect(() => {
    languageRef.current = language;
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    let mounted = true;
    chatRequest("/api/chat/auth/me")
      .then(({ user: currentUser }) => {
        if (mounted) setUser(currentUser);
      })
      .catch((error) => {
        if (mounted && error.status !== 401) setPageError(getErrorMessage(error));
      })
      .finally(() => {
        if (mounted) setAuthLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    const socket = io({ withCredentials: true });
    socketRef.current = socket;
    chatRequest("/api/chat/calls/config")
      .then(({ iceServers }) => setCallIceServers(iceServers))
      .catch((error) => setPageError(getErrorMessage(error)));
    socket.on("presence:sync", ({ onlineUserIds: ids }) => setOnlineUserIds(ids || []));
    socket.on("presence:update", ({ userId: changedUserId, online }) => {
      setOnlineUserIds((current) => online
        ? [...new Set([...current, changedUserId])]
        : current.filter((id) => id !== changedUserId));
    });
    socket.on("connect_error", (error) => setPageError(getErrorMessage(error)));
    socket.on("conversation:created", () => setReloadKey((key) => key + 1));
    socket.on("chat:message", ({ conversationId, preserveScroll }) => {
      if (activeConversationRef.current === conversationId) preserveMessageScrollRef.current = Boolean(preserveScroll);
      setSavedRefreshKey((key) => key + 1);
      setReloadKey((key) => key + 1);
    });
    socket.on("chat:saved", () => {
      setSavedRefreshKey((key) => key + 1);
      setReloadKey((key) => key + 1);
    });
    socket.on("chat:message-hidden", ({ messageId }) => {
      setMessageState((current) => ({ ...current, items: current.items.filter((item) => item.id !== messageId) }));
      setSavedMessages((current) => current.filter((item) => item.id !== messageId));
      setSavedRefreshKey((key) => key + 1);
    });
    socket.on("call:incoming", (call) => {
      if (!call?.callId || !call?.conversationId || !call?.offer) return;
      setCallError("");
      setCallOutcome(null);
      callHeldRef.current = false;
      setCallHeld(false);
      setRemoteCallMedia({ cameraEnabled: false, sharingScreen: false, onHold: false });
      incomingCallRef.current = call;
      callContextRef.current = {
        callId: call.callId,
        conversationId: call.conversationId,
        remoteUserId: call.callerId,
        remoteName: call.callerName,
        serverSessionAvailable: true,
        videoSupported: /^m=video\s/m.test(call.offer.sdp),
      };
      setCallDetails(callContextRef.current);
      setIncomingCall(call);
      setCallState("incoming");
    });
    socket.on("call:media-state", ({ callId, cameraEnabled, sharingScreen, onHold }) => {
      if (callContextRef.current?.callId !== callId) return;
      setRemoteCallMedia({
        cameraEnabled: cameraEnabled === true,
        sharingScreen: sharingScreen === true,
        onHold: onHold === true,
      });
    });
    socket.on("call:answer", async ({ callId, answer }) => {
      if (callContextRef.current?.callId !== callId || !callPeerRef.current) return;
      try {
        await callPeerRef.current.setRemoteDescription(answer);
        const queuedCandidates = remoteIceCandidatesRef.current.filter((item) => item.callId === callId);
        remoteIceCandidatesRef.current = remoteIceCandidatesRef.current.filter((item) => item.callId !== callId);
        for (const item of queuedCandidates) await callPeerRef.current.addIceCandidate(item.candidate);
        setCallState("connecting");
      } catch (error) {
        showCallError(translate(languageRef.current, "callFailed"));
        hangUpCallRef.current();
      }
    });
    socket.on("call:candidate", async ({ callId, candidate }) => {
      if (callContextRef.current?.callId !== callId) return;
      const peer = callPeerRef.current;
      if (!peer?.remoteDescription) {
        remoteIceCandidatesRef.current.push({ callId, candidate });
        return;
      }
      try {
        await peer.addIceCandidate(candidate);
      } catch (error) {
        showCallError(translate(languageRef.current, "callFailed"));
        hangUpCallRef.current();
      }
    });
    socket.on("call:ended", ({ callId, reason }) => {
      if (callContextRef.current?.callId !== callId && incomingCallRef.current?.callId !== callId) return;
      const context = callContextRef.current;
      const incoming = incomingCallRef.current?.callId === callId;
      const callKind = context?.videoSupported ? "video" : "voice";
      const remoteName = context?.remoteName || incomingCallRef.current?.callerName || "";
      cleanupCallRef.current();
      if (reason === "no-answer") {
        setCallOutcome({ kind: callKind, missed: incoming, name: remoteName });
      } else {
        const noticeKey = reason === "declined" ? "callDeclined" : "callEnded";
        setActionNotice(translate(languageRef.current, noticeKey));
      }
    });
    socket.on("disconnect", () => {
      if (callContextRef.current) {
        cleanupCallRef.current();
        showCallError(translate(languageRef.current, "callFailed"));
      }
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    async function loadChatData() {
      setLoadingChat(true);
      setPageError("");
      try {
        const [{ users }, nextConversations] = await Promise.all([
          chatRequest("/api/chat/users"),
          fetchConversations(userId),
        ]);
        if (cancelled) return;
        setDirectory(users.map((profile) => ({
          id: profile.id,
          display_name: profile.displayName,
          avatar_url: profile.avatarUrl,
        })));
        setConversations(nextConversations);
        setActiveConversationId((current) => (
          current && nextConversations.some((conversation) => conversation.id === current)
            ? current
            : nextConversations[0]?.id || ""
        ));
      } catch (error) {
        if (!cancelled) setPageError(getErrorMessage(error));
      } finally {
        if (!cancelled) setLoadingChat(false);
      }
    }
    loadChatData();
    return () => { cancelled = true; };
  }, [userId, reloadKey]);

  useEffect(() => {
    if (!userId || !activeConversationId) return undefined;
    socketRef.current?.emit("conversation:join", activeConversationId, (result) => {
      if (result?.onlineUserIds) setOnlineUserIds((current) => [...new Set([...current, ...result.onlineUserIds])]);
    });
    let cancelled = false;
    async function loadMessages() {
      try {
        const { messages: results, hasMore, nextCursor } = await chatRequest(`/api/chat/conversations/${activeConversationId}/messages`);
        if (!cancelled) {
          setMessageState({ conversationId: activeConversationId, items: results.map(mapMessage), hasMore, cursor: nextCursor });
          setConversations((current) => current.map((conversation) => (
            conversation.id === activeConversationId ? { ...conversation, unreadCount: 0 } : conversation
          )));
        }
      } catch (error) {
        if (!cancelled) {
          setMessageState({ conversationId: activeConversationId, items: [], hasMore: false, cursor: "" });
          setPageError(getErrorMessage(error));
        }
      }
    }
    loadMessages();
    return () => { cancelled = true; };
  }, [activeConversationId, userId, reloadKey]);

  useEffect(() => {
    if (!savedOpen || !userId) return undefined;
    let cancelled = false;
    async function loadSavedMessages() {
      setSavedLoading(true);
      setPageError("");
      try {
        const { messages: results, hasMore, nextCursor } = await chatRequest("/api/chat/messages/saved");
        if (!cancelled) {
          setSavedMessages(results.map(mapMessage));
          setSavedHasMore(hasMore);
          setSavedCursor(nextCursor);
        }
      } catch (error) {
        if (!cancelled) setPageError(getErrorMessage(error));
      } finally {
        if (!cancelled) setSavedLoading(false);
      }
    }
    loadSavedMessages();
    return () => { cancelled = true; };
  }, [savedOpen, userId, savedRefreshKey]);

  useEffect(() => {
    if (!attachment) return undefined;
    if (!attachment.previewUrl) return undefined;
    return () => URL.revokeObjectURL(attachment.previewUrl);
  }, [attachment]);

  useEffect(() => {
    if (preserveMessageScrollRef.current) {
      preserveMessageScrollRef.current = false;
      return;
    }
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeConversationId]);

  useEffect(() => () => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    callPeerRef.current?.close();
    screenShareStreamRef.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    callLocalStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function openDirectChat(profile) {
    setPageError("");
    try {
      const { conversationId } = await chatRequest("/api/chat/conversations/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: profile.id }),
      });
      setActiveConversationId(conversationId);
      setMobileListOpen(false);
      setContactPickerOpen(false);
      setDirectoryQuery("");
      setReloadKey((key) => key + 1);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  async function createGroup(event) {
    event.preventDefault();
    setPageError("");
    if (!groupTitle.trim() || groupMemberIds.length === 0) {
      setPageError(text("groupRequired"));
      return;
    }
    try {
      const { conversationId } = await chatRequest("/api/chat/conversations/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: groupTitle.trim(), description: groupDescription.trim(), kind: groupKind, memberIds: groupMemberIds }),
      });
      setActiveConversationId(conversationId);
      setMobileListOpen(false);
      setGroupDialogOpen(false);
      setGroupTitle("");
      setGroupDescription("");
      setGroupKind("group");
      setGroupMemberIds([]);
      setActionNotice(groupKind === "community" ? text("communityCreated") : text("groupCreated"));
      setReloadKey((key) => key + 1);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  function chooseImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!supportedMediaTypes.includes(file.type)) {
      setPageError(text("unsupportedMedia"));
      return;
    }
    const maxSize = supportedImageTypes.includes(file.type) ? maxImageBytes : maxMediaBytes;
    if (file.size > maxSize) {
      setPageError(text("mediaTooLarge"));
      return;
    }
    setPageError("");
    setAttachment({ file, previewUrl: URL.createObjectURL(file) });
  }

  async function startRecording(kind) {
    setPageError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error(text("recordingUnsupported"));
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === "video",
      });
      recordingStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      let totalBytes = 0;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
          totalBytes += event.data.size;
          if (totalBytes > maxMediaBytes && recorder.state === "recording") recorder.stop();
        }
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        recorderRef.current = null;
        setRecordingType("");
        setPageError(text("recordingFailed"));
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        recorderRef.current = null;
        setRecordingType("");
        const blob = new Blob(chunks, { type: recorder.mimeType || (kind === "video" ? "video/webm" : "audio/webm") });
        if (blob.size > maxMediaBytes) {
          setPageError(text("mediaTooLarge"));
          return;
        }
        const contentType = blob.type.split(";")[0];
        const extension = contentType.endsWith("/mp4") ? "mp4" : contentType === "audio/ogg" ? "ogg" : contentType === "audio/mpeg" ? "mp3" : contentType === "audio/wav" ? "wav" : "webm";
        const file = new File([blob], `recording-${Date.now()}.${extension}`, { type: contentType });
        setAttachment({ file, previewUrl: URL.createObjectURL(file) });
      };
      recorder.start(1000);
      setRecordingType(kind);
    } catch (error) {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      recorderRef.current = null;
      setRecordingType("");
      setPageError(getErrorMessage(error));
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function cleanupCall() {
    screenShareStreamRef.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    screenShareStreamRef.current = null;
    callPeerRef.current?.close();
    callPeerRef.current = null;
    callVideoSenderRef.current = null;
    callLocalStreamRef.current?.getTracks().forEach((track) => track.stop());
    callLocalStreamRef.current = null;
    callContextRef.current = null;
    incomingCallRef.current = null;
    remoteIceCandidatesRef.current = [];
    localIceCandidatesRef.current = [];
    callSignalingReadyRef.current = false;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.muted = false;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    remoteCallStreamRef.current = null;
    setCallState("idle");
    setCallDetails(null);
    setIncomingCall(null);
    setCallMuted(false);
    setCallSpeakerMuted(false);
    callHeldRef.current = false;
    setCallHeld(false);
    setCallVideoSupported(false);
    setCallCameraAvailable(false);
    setCallCameraEnabled(false);
    setCallScreenSharing(false);
    setRemoteCallMedia({ cameraEnabled: false, sharingScreen: false, onHold: false });
    setCallMoreOpen(false);
  }

  function sendCallCandidate(context, candidate) {
    socketRef.current?.emit("call:candidate", {
      callId: context.callId,
      conversationId: context.conversationId,
      candidate,
    });
  }

  function flushLocalCallCandidates(context) {
    callSignalingReadyRef.current = true;
    for (const candidate of localIceCandidatesRef.current) sendCallCandidate(context, candidate);
    localIceCandidatesRef.current = [];
  }

  async function flushRemoteCallCandidates(callId, peer) {
    const queuedCandidates = remoteIceCandidatesRef.current.filter((item) => item.callId === callId);
    remoteIceCandidatesRef.current = remoteIceCandidatesRef.current.filter((item) => item.callId !== callId);
    for (const item of queuedCandidates) await peer.addIceCandidate(item.candidate);
  }

  function showCallError(message) {
    setPageError("");
    setCallError(message);
  }

  async function getCallMedia(withVideo) {
    if (!withVideo) return navigator.mediaDevices.getUserMedia({ audio: true });
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setActionNotice(text("cameraUnavailable"));
      return audioStream;
    }
  }

  function emitCallMediaState(cameraEnabled, sharingScreen, onHold = callHeldRef.current) {
    const context = callContextRef.current;
    const socket = socketRef.current;
    if (!context?.serverSessionAvailable || !socket?.connected) return;
    socket.emit("call:media-state", {
      callId: context.callId,
      conversationId: context.conversationId,
      cameraEnabled,
      sharingScreen,
      onHold,
    }, (result) => {
      if (result?.error) showCallError(text("callFailed"));
    });
  }

  function toggleCallCamera() {
    const cameraTrack = callLocalStreamRef.current?.getVideoTracks()[0];
    if (!cameraTrack || callScreenSharing || callHeldRef.current) return;
    const cameraEnabled = !callCameraEnabled;
    cameraTrack.enabled = cameraEnabled;
    setCallCameraEnabled(cameraEnabled);
    emitCallMediaState(cameraEnabled, false);
  }

  function toggleCallSpeaker() {
    const speakerMuted = !callSpeakerMuted;
    setCallSpeakerMuted(speakerMuted);
    setCallMoreOpen(false);
    if (!remoteAudioRef.current) return;
    remoteAudioRef.current.muted = speakerMuted || callHeldRef.current;
    if (!speakerMuted) {
      remoteAudioRef.current.play().catch(() => {
        showCallError(text("callAudioPlayback"));
      });
    }
  }

  async function stopCallScreenShare() {
    const screenStream = screenShareStreamRef.current;
    if (!screenStream) return;
    const screenTrack = screenStream.getVideoTracks()[0];
    if (screenTrack) screenTrack.onended = null;
    const cameraTrack = callLocalStreamRef.current?.getVideoTracks()[0] || null;
    if (cameraTrack) cameraTrack.enabled = false;
    try {
      await callVideoSenderRef.current?.replaceTrack(cameraTrack);
    } catch {
      showCallError(text("screenShareFailed"));
    }
    screenStream.getTracks().forEach((track) => track.stop());
    screenShareStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = callLocalStreamRef.current;
    setCallScreenSharing(false);
    setCallCameraEnabled(false);
    emitCallMediaState(false, false);
  }

  async function toggleCallScreenShare() {
    if (callScreenSharing) {
      await stopCallScreenShare();
      return;
    }
    if (!callVideoSupported || !callVideoSenderRef.current || callHeldRef.current) return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      showCallError(text("screenShareUnsupported"));
      return;
    }
    const activeCallId = callContextRef.current?.callId;
    const videoSender = callVideoSenderRef.current;
    if (!activeCallId || !videoSender) return;
    let screenStream;
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack || callContextRef.current?.callId !== activeCallId || callVideoSenderRef.current !== videoSender || callHeldRef.current) {
        screenStream.getTracks().forEach((track) => track.stop());
        return;
      }
      await videoSender.replaceTrack(screenTrack);
      if (callContextRef.current?.callId !== activeCallId || callVideoSenderRef.current !== videoSender) {
        await videoSender.replaceTrack(null);
        screenStream.getTracks().forEach((track) => track.stop());
        return;
      }
      screenShareStreamRef.current = screenStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      const cameraTrack = callLocalStreamRef.current?.getVideoTracks()[0];
      if (cameraTrack) cameraTrack.enabled = false;
      setCallCameraEnabled(false);
      setCallScreenSharing(true);
      emitCallMediaState(false, true);
      screenTrack.onended = () => {
        void stopCallScreenShare();
      };
    } catch (error) {
      screenStream?.getTracks().forEach((track) => track.stop());
      if (error.name !== "NotAllowedError") showCallError(text("screenShareFailed"));
    }
  }

  function configureCallPeer(peer, context) {
    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      const candidate = event.candidate.toJSON();
      if (callSignalingReadyRef.current) sendCallCandidate(context, candidate);
      else localIceCandidatesRef.current.push(candidate);
    };
    peer.ontrack = (event) => {
      let remoteStream = remoteCallStreamRef.current;
      if (!remoteStream) {
        remoteStream = new MediaStream();
        remoteCallStreamRef.current = remoteStream;
      }
      if (!remoteStream.getTracks().some((track) => track.id === event.track.id)) {
        remoteStream.addTrack(event.track);
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        if (event.track.kind === "audio") {
          remoteAudioRef.current.play().catch(() => {
            setActionNotice(text("callAudioPlayback"));
          });
        }
      }
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setCallState("active");
      if (peer.connectionState === "failed") {
        showCallError(text("callFailed"));
        hangUpCallRef.current();
      }
    };
  }

  async function startAudioCall(conversation = activeConversation) {
    if (!canCallConversation(conversation) || callContextRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      showCallError(text("callUnsupported"));
      return;
    }
    const socket = socketRef.current;
    if (!socket?.connected) {
      showCallError(text("callFailed"));
      return;
    }
    setPageError("");
    setCallError("");
    callHeldRef.current = false;
    setCallHeld(false);
    const context = {
      callId: crypto.randomUUID(),
      conversationId: conversation.id,
      remoteUserId: conversation.otherMember.user_id,
      remoteName: conversation.displayTitle,
      serverSessionAvailable: false,
      offerPending: false,
      videoSupported: false,
    };
    setCallOutcome(null);
    callContextRef.current = context;
    setCallDetails({ ...context });
    setCallState("connecting");
    try {
      const stream = await getCallMedia(true);
      if (callContextRef.current?.callId !== context.callId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const cameraTrack = stream.getVideoTracks()[0] || null;
      if (cameraTrack) cameraTrack.enabled = false;
      context.videoSupported = true;
      setCallDetails({ ...context });
      callLocalStreamRef.current = stream;
      setCallVideoSupported(true);
      setCallCameraAvailable(Boolean(cameraTrack));
      setCallCameraEnabled(false);
      setCallScreenSharing(false);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const peer = new RTCPeerConnection({ iceServers: callIceServers });
      callPeerRef.current = peer;
      configureCallPeer(peer, context);
      let videoSender = null;
      for (const track of stream.getTracks()) {
        if (track.kind === "video") videoSender = peer.addTrack(track, stream);
        else peer.addTrack(track, stream);
      }
      if (!videoSender) videoSender = peer.addTransceiver("video", { direction: "sendrecv" }).sender;
      callVideoSenderRef.current = videoSender;
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      if (callContextRef.current?.callId !== context.callId) return;
      context.offerPending = true;
      await emitSocketAck(socket, "call:offer", {
        callId: context.callId,
        conversationId: context.conversationId,
        offer: peer.localDescription.toJSON(),
      });
      context.offerPending = false;
      context.serverSessionAvailable = true;
      if (callContextRef.current?.callId !== context.callId) {
        socket.emit("call:end", { callId: context.callId, conversationId: context.conversationId });
        return;
      }
      flushLocalCallCandidates(context);
      setCallState("outgoing");
    } catch (error) {
      if (callContextRef.current?.callId !== context.callId) return;
      if (context.offerPending) {
        context.offerPending = false;
        if (socket.connected) socket.emit("call:end", { callId: context.callId, conversationId: context.conversationId });
      }
      cleanupCall();
      showCallError(["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(error.name)
        ? text("callMicError")
        : text("callFailed"));
    }
  }

  async function answerIncomingCall() {
    const call = incomingCallRef.current;
    const socket = socketRef.current;
    if (!call) return;
    if (!socket?.connected) {
      cleanupCall();
      showCallError(text("callFailed"));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      showCallError(text("callUnsupported"));
      return;
    }
    setCallState("connecting");
    setPageError("");
    setCallError("");
    try {
      const offeredVideo = callContextRef.current?.videoSupported === true;
      const stream = await getCallMedia(offeredVideo);
      if (incomingCallRef.current?.callId !== call.callId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const cameraTrack = stream.getVideoTracks()[0] || null;
      if (cameraTrack) cameraTrack.enabled = false;
      callLocalStreamRef.current = stream;
      const context = {
        callId: call.callId,
        conversationId: call.conversationId,
        remoteUserId: call.callerId,
        remoteName: call.callerName,
        serverSessionAvailable: true,
        videoSupported: offeredVideo,
      };
      callContextRef.current = context;
      setCallDetails(context);
      setCallVideoSupported(offeredVideo);
      setCallCameraAvailable(Boolean(cameraTrack));
      setCallCameraEnabled(false);
      setCallScreenSharing(false);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const peer = new RTCPeerConnection({ iceServers: callIceServers });
      callPeerRef.current = peer;
      configureCallPeer(peer, context);
      await peer.setRemoteDescription(call.offer);
      if (callContextRef.current?.callId !== context.callId) return;
      await flushRemoteCallCandidates(call.callId, peer);
      for (const track of stream.getAudioTracks()) peer.addTrack(track, stream);
      if (offeredVideo) {
        const videoTransceiver = peer.getTransceivers().find((transceiver) => transceiver.receiver.track.kind === "video");
        if (videoTransceiver) {
          videoTransceiver.direction = "sendrecv";
          callVideoSenderRef.current = videoTransceiver.sender;
          if (cameraTrack) await videoTransceiver.sender.replaceTrack(cameraTrack);
        } else if (cameraTrack) {
          callVideoSenderRef.current = peer.addTrack(cameraTrack, stream);
        }
      }
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      if (callContextRef.current?.callId !== context.callId) return;
      await emitSocketAck(socket, "call:answer", {
        callId: context.callId,
        conversationId: context.conversationId,
        answer: peer.localDescription.toJSON(),
      });
      if (callContextRef.current?.callId !== context.callId) {
        socket.emit("call:end", { callId: context.callId, conversationId: context.conversationId });
        return;
      }
      incomingCallRef.current = null;
      setIncomingCall(null);
      flushLocalCallCandidates(context);
      setCallState("connecting");
    } catch (error) {
      if (callContextRef.current?.callId !== call.callId) return;
      socket.emit("call:decline", { callId: call.callId, conversationId: call.conversationId });
      cleanupCall();
      showCallError(["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(error.name)
        ? text("callMicError")
        : text("callFailed"));
    }
  }

  function declineIncomingCall() {
    const call = incomingCallRef.current;
    if (call) {
      socketRef.current?.emit("call:decline", { callId: call.callId, conversationId: call.conversationId });
    }
    cleanupCall();
  }

  function hangUpCall() {
    const context = callContextRef.current;
    const socket = socketRef.current;
    if (context?.serverSessionAvailable && !context.offerPending && socket?.connected) {
      socket.emit("call:end", {
        callId: context.callId,
        conversationId: context.conversationId,
      }, (result) => {
        if (result?.error) showCallError(result.error);
      });
    }
    cleanupCall();
  }

  function toggleCallMute() {
    const nextMuted = !callMuted;
    callLocalStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted && !callHeldRef.current;
    });
    setCallMuted(nextMuted);
  }

  function toggleCallHold() {
    const nextHeld = !callHeldRef.current;
    callHeldRef.current = nextHeld;
    callLocalStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextHeld && !callMuted;
    });
    const outgoingVideoTrack = callScreenSharing
      ? screenShareStreamRef.current?.getVideoTracks()[0]
      : callLocalStreamRef.current?.getVideoTracks()[0];
    if (outgoingVideoTrack) {
      outgoingVideoTrack.enabled = !nextHeld && (callScreenSharing || callCameraEnabled);
    }
    if (remoteAudioRef.current) remoteAudioRef.current.muted = nextHeld || callSpeakerMuted;
    setCallHeld(nextHeld);
    emitCallMediaState(nextHeld ? false : callCameraEnabled, nextHeld ? false : callScreenSharing, nextHeld);
  }

  useEffect(() => {
    cleanupCallRef.current = cleanupCall;
    hangUpCallRef.current = hangUpCall;
  });

  async function uploadProfilePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!supportedImageTypes.includes(file.type)) {
      setPageError(text("chooseImage"));
      return;
    }
    if (file.size > maxImageBytes) {
      setPageError(text("imageTooLarge"));
      return;
    }
    setPageError("");
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.set("avatar", file);
      const { user: updatedUser } = await chatRequest("/api/chat/profile/avatar", {
        method: "PUT",
        body: formData,
      });
      setUser(updatedUser);
      setProfilePhotoDialogOpen(false);
      setActionNotice(text("photoSaved"));
      setReloadKey((key) => key + 1);
    } catch (error) {
      setPageError(error.message || text("photoUploadError"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removeProfilePhoto() {
    setPageError("");
    setUploadingPhoto(true);
    try {
      const { user: updatedUser } = await chatRequest("/api/chat/profile/avatar", { method: "DELETE" });
      setUser(updatedUser);
      setActionNotice(text("photoRemoved"));
      setReloadKey((key) => key + 1);
    } catch (error) {
      setPageError(error.message || text("photoUploadError"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!activeConversation || sending) return;
    const body = draft.trim();
    if (!body && !attachment) return;
    setSending(true);
    setPageError("");
    try {
      const formData = new FormData();
      formData.set("body", body);
      if (attachment) formData.set("media", attachment.file);
      const { message } = await chatRequest(`/api/chat/conversations/${activeConversation.id}/messages`, {
        method: "POST",
        body: formData,
      });
      setMessageState((current) => current.conversationId === activeConversation.id
        ? {
          ...current,
          items: current.items.some((item) => item.id === message.id) ? current.items : [...current.items, mapMessage(message)],
        }
        : current);
      setDraft("");
      setAttachment(null);
      setActionNotice(text("messageSent"));
      setReloadKey((key) => key + 1);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  }

  function applyMessageUpdate(message) {
    const updated = mapMessage(message);
    setMessageState((current) => current.conversationId === updated.conversation_id
      ? { ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) }
      : current);
    return updated;
  }

  function beginEditMessage(message) {
    setEditingMessageId(message.id);
    setEditingMessageDraft(message.body);
    setPageError("");
  }

  function cancelEditMessage() {
    setEditingMessageId("");
    setEditingMessageDraft("");
  }

  async function updateMessage(event, messageId) {
    event.preventDefault();
    const body = editingMessageDraft.trim();
    if (!body || messageActionBusy) return;
    setMessageActionBusy(messageId);
    setPageError("");
    try {
      const { message } = await chatRequest(`/api/chat/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      applyMessageUpdate(message);
      cancelEditMessage();
      setActionNotice(text("messageUpdated"));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setMessageActionBusy("");
    }
  }

  async function deleteMessage(message, scope) {
    if (!message || messageActionBusy) return;
    setMessageActionBusy(message.id);
    setPageError("");
    try {
      if (scope === "me") {
        await chatRequest(`/api/chat/messages/${message.id}/me`, { method: "DELETE" });
        setMessageState((current) => current.conversationId === message.conversation_id
          ? { ...current, items: current.items.filter((item) => item.id !== message.id) }
          : current);
        setActionNotice(text("messageDeletedForMe"));
      } else {
        const { message: deletedMessage } = await chatRequest(`/api/chat/messages/${message.id}`, { method: "DELETE" });
        applyMessageUpdate(deletedMessage);
        setActionNotice(text("messageDeleted"));
      }
      setSavedMessages((current) => current.filter((savedMessage) => savedMessage.id !== message.id));
      if (editingMessageId === message.id) cancelEditMessage();
      setDeleteTarget(null);
      setSavedRefreshKey((key) => key + 1);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setMessageActionBusy("");
    }
  }

  async function toggleSavedMessage(message) {
    if (messageActionBusy || message.is_deleted) return;
    const isSaved = !message.is_saved;
    setMessageActionBusy(message.id);
    setPageError("");
    try {
      await chatRequest(`/api/chat/messages/${message.id}/saved`, { method: isSaved ? "PUT" : "DELETE" });
      const updatedMessage = { ...message, is_saved: isSaved };
      setMessageState((current) => current.conversationId === message.conversation_id
        ? { ...current, items: current.items.map((item) => item.id === message.id ? updatedMessage : item) }
        : current);
      setSavedMessages((current) => isSaved
        ? [{ ...updatedMessage, conversation_title: message.conversation_title || activeConversation?.displayTitle }, ...current.filter((item) => item.id !== message.id)]
        : current.filter((item) => item.id !== message.id));
      setSavedRefreshKey((key) => key + 1);
      setActionNotice(text(isSaved ? "messageSaved" : "messageUnsaved"));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setMessageActionBusy("");
    }
  }

  async function toggleMessageReaction(message, emoji) {
    if (messageActionBusy || message.is_deleted) return;
    setMessageActionBusy(message.id);
    setPageError("");
    try {
      const { message: updatedMessage } = await chatRequest(`/api/chat/messages/${message.id}/reactions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const updated = applyMessageUpdate(updatedMessage);
      setSavedMessages((current) => current.map((item) => item.id === updated.id
        ? { ...updated, conversation_title: item.conversation_title }
        : item));
      setReactionTarget(null);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setMessageActionBusy("");
    }
  }

  async function loadMoreSavedMessages() {
    if (!savedHasMore || !savedCursor || savedLoading) return;
    setSavedLoading(true);
    setPageError("");
    try {
      const { messages: results, hasMore, nextCursor } = await chatRequest(
        `/api/chat/messages/saved?before=${encodeURIComponent(savedCursor)}`,
      );
      setSavedMessages((current) => [...current, ...results.map(mapMessage)]);
      setSavedHasMore(hasMore);
      setSavedCursor(nextCursor);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setSavedLoading(false);
    }
  }

  function openSavedConversation(message) {
    setActiveConversationId(message.conversation_id);
    setMobileListOpen(false);
    setSavedOpen(false);
  }

  async function changeConversation(action) {
    if (!activeConversation) return;
    setPageError("");
    try {
      await chatRequest(`/api/chat/conversations/${activeConversation.id}/${action}`, { method: "POST" });
      setActiveConversationId("");
      setActionNotice(text(action === "request/spam" ? "markedSpam" : action === "archive" ? "archiveChat" : "unarchiveChat"));
      setReloadKey((key) => key + 1);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  async function acceptRequest() {
    if (!activeConversation) return;
    setPageError("");
    try {
      await chatRequest(`/api/chat/conversations/${activeConversation.id}/request/accept`, { method: "POST" });
      setActionNotice(text("acceptRequest"));
      setReloadKey((key) => key + 1);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  async function openSettings() {
    setPageError("");
    try {
      const { settings: savedSettings } = await chatRequest("/api/chat/settings");
      setSettings(savedSettings);
      setSettingsOpen(true);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSettingsSaving(true);
    setPageError("");
    try {
      const { settings: savedSettings } = await chatRequest("/api/chat/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSettings(savedSettings);
      setSettingsOpen(false);
      setActionNotice(text("saved"));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setSettingsSaving(false);
    }
  }

  function openSavedMessages() {
    setPageError("");
    setSavedMessages([]);
    setSavedHasMore(false);
    setSavedCursor("");
    setSavedOpen(true);
  }

  async function openMediaManager() {
    setPageError("");
    try {
      const { storage } = await chatRequest("/api/chat/storage");
      setMediaItems(storage.items);
      setMediaBytes(storage.bytes);
      setMediaOpen(true);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  async function deleteMedia(messageId) {
    setPageError("");
    try {
      await chatRequest(`/api/chat/storage/${messageId}`, { method: "DELETE" });
      setMediaItems((items) => items.filter((item) => item.messageId !== messageId));
      setMediaBytes((bytes) => Math.max(0, bytes - mediaItems.filter((item) => item.messageId === messageId).reduce((total, item) => total + item.size, 0)));
      setReloadKey((key) => key + 1);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  async function openHistory() {
    setPageError("");
    try {
      const { backups: savedBackups } = await chatRequest("/api/chat/history/backups");
      setBackups(savedBackups);
      setHistoryOpen(true);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  async function createBackup() {
    setHistoryBusy(true);
    setPageError("");
    try {
      const { backup } = await chatRequest("/api/chat/history/backups", { method: "POST" });
      setBackups((current) => [backup, ...current]);
      setActionNotice(text("backupCreated"));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setHistoryBusy(false);
    }
  }

  async function restoreBackup(backupId) {
    setHistoryBusy(true);
    setPageError("");
    try {
      await chatRequest(`/api/chat/history/backups/${backupId}/restore`, { method: "POST" });
      setActionNotice(text("backupRestored"));
      setReloadKey((key) => key + 1);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setHistoryBusy(false);
    }
  }

  async function deleteBackup(backupId) {
    setPageError("");
    try {
      await chatRequest(`/api/chat/history/backups/${backupId}`, { method: "DELETE" });
      setBackups((current) => current.filter((backup) => backup.id !== backupId));
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  async function loadOlderMessages() {
    if (!activeConversationId || !messageState.hasMore || loadingOlder) return;
    setLoadingOlder(true);
    setPageError("");
    try {
      const { messages: olderMessages, hasMore, nextCursor } = await chatRequest(
        `/api/chat/conversations/${activeConversationId}/messages?before=${encodeURIComponent(messageState.cursor)}`,
      );
      preserveMessageScrollRef.current = true;
      setMessageState((current) => current.conversationId === activeConversationId
        ? {
          ...current,
          items: [...olderMessages.map(mapMessage), ...current.items],
          hasMore,
          cursor: nextCursor,
        }
        : current);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoadingOlder(false);
    }
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setPageError("");
    try {
      if (incomingCallRef.current) declineIncomingCall();
      else hangUpCallRef.current();
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.ondataavailable = null;
        recorderRef.current.onstop = null;
        recorderRef.current.onerror = null;
        recorderRef.current.stop();
      }
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      recorderRef.current = null;
      setRecordingType("");
      await chatRequest("/api/chat/auth/logout", { method: "POST" });
      socketRef.current?.disconnect();
      window.location.replace("/chat");
    } catch (error) {
      setPageError(getErrorMessage(error));
      setSigningOut(false);
    }
  }

  if (authLoading) {
    return <main className="chat-loading-page" dir={language === "ar" ? "rtl" : "ltr"} lang={language}><span className="chat-spinner" />{text("connecting")}</main>;
  }
  if (!user) return <AuthPanel language={language} onLanguageChange={changeLanguage} />;

  const onlineCount = activeConversation
    ? activeConversation.members.filter((member) => member.user_id !== userId && onlineUserIds.includes(member.user_id)).length
    : 0;
  const headerProfile = activeConversation?.otherMember?.profile;
  const remoteHasVideo = remoteCallMedia.cameraEnabled || remoteCallMedia.sharingScreen;
  const localHasVideo = callCameraEnabled || callScreenSharing;
  const callUsesVideo = callDetails?.videoSupported || remoteHasVideo || localHasVideo;
  const callStatusLabel = callState === "outgoing"
    ? text("outgoingCall").replace("{name}", callDetails?.remoteName || "")
    : callState === "active" && callHeld
      ? text("callOnHold").replace("{name}", callDetails?.remoteName || "")
      : callState === "active" && remoteCallMedia.onHold
        ? text("remoteCallOnHold").replace("{name}", callDetails?.remoteName || "")
        : callState === "active"
      ? text(callUsesVideo ? "videoCallWith" : "activeCall").replace("{name}", callDetails?.remoteName || "")
      : text("connectingCall");
  const callCanBeCancelled = callState === "connecting" || callState === "outgoing";

  return (
    <main
      className="chat-page"
      dir={language === "ar" ? "rtl" : "ltr"}
      lang={language}
      style={{
        "--chat-accent": displayPreferences.accentColor,
        "--chat-display-brightness": displayPreferences.brightness / 100,
      }}
    >
      <header className="chat-topbar">
        <Link className="chat-top-brand" href="/" aria-label={text("back")}>
          <span className="chat-brand-mark">✚</span>
          <span><strong>Pharmacy ELAF</strong><small>{text("teamChat")}</small></span>
        </Link>
        <div className="chat-top-user">
          <input ref={profilePhotoInputRef} className="chat-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadProfilePhoto} />
          <input ref={profilePhotoCaptureInputRef} className="chat-file-input" type="file" accept="image/*" capture="user" onChange={uploadProfilePhoto} />
          <button type="button" className="chat-profile-photo-button" onClick={() => setProfilePhotoDialogOpen(true)} disabled={uploadingPhoto} aria-label={text("changePhoto")} title={text(uploadingPhoto ? "uploadingPhoto" : "changePhoto")}>
            <Avatar profile={{ display_name: ownName, avatar_url: user.avatarUrl }} small />
            <span aria-hidden="true">{uploadingPhoto ? "…" : "📸"}</span>
          </button>
          {user.avatarUrl && <button type="button" className="chat-photo-remove-button" onClick={removeProfilePhoto} disabled={uploadingPhoto} aria-label={text("removePhoto")} title={text("removePhoto")}>×</button>}
          <span>{ownName}</span>
          <LanguageSelect language={language} onChange={changeLanguage} />
          <button type="button" className="chat-quiet-button" onClick={() => { setPageError(""); setLogoutDialogOpen(true); }}>{text("signOut")}</button>
        </div>
      </header>
      {actionNotice && <p className="chat-global-notice" role="status">{actionNotice}</p>}
      {logoutDialogOpen && (
        <div className="chat-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !signingOut) {
            setLogoutDialogOpen(false);
            setPageError("");
          }
        }}>
          <section className="chat-tool-modal chat-logout-modal" role="alertdialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description">
            <span className="chat-logout-icon" aria-hidden="true">↪</span>
            <h2 id="logout-title">{text("signOutTitle")}</h2>
            <p id="logout-description">{text("signOutDescription")}</p>
            {pageError && <p className="chat-alert chat-alert-error" role="alert">{pageError}</p>}
            <div className="chat-logout-actions">
              <button type="button" className="chat-secondary-button" onClick={() => { setLogoutDialogOpen(false); setPageError(""); }} disabled={signingOut}>{text("cancel")}</button>
              <button type="button" className="chat-logout-confirm" onClick={signOut} disabled={signingOut}>{signingOut ? text("signingOut") : text("signOut")}</button>
            </div>
          </section>
        </div>
      )}
      {callDetails && callState !== "incoming" && callState !== "idle" && (
        <div className="chat-modal-backdrop chat-call-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCallMoreOpen(false); }}>
          <section className="chat-call-bar" role="dialog" aria-modal="true" aria-labelledby="call-panel-status">
            <header className="chat-call-heading">
              <span className="chat-call-icon" aria-hidden="true">☎</span>
              <span>
                <small>{text(callUsesVideo ? "videoCall" : "voiceCall")}</small>
                <strong id="call-panel-status">{callStatusLabel}</strong>
              </span>
            </header>
            <div className="chat-call-video-stage">
              <div className={`chat-call-video-main${remoteCallMedia.sharingScreen ? " chat-call-video-share" : ""}`}>
                <video
                  ref={remoteVideoRef}
                  className={`chat-call-video${remoteHasVideo ? " visible" : ""}`}
                  autoPlay
                  playsInline
                  muted
                  aria-label={callDetails.remoteName}
                />
                {!remoteHasVideo && <div className="chat-call-video-placeholder">
                  <span>{callDetails.remoteName?.slice(0, 1)?.toUpperCase() || "?"}</span>
                  <strong>{callDetails.remoteName}</strong>
                  <small>{remoteCallMedia.onHold ? text("callOnHoldLabel") : callState === "active" ? text("cameraOff") : text("connectingCall")}</small>
                </div>}
                <span className="chat-call-video-name">{callDetails.remoteName}</span>
                {remoteCallMedia.sharingScreen && <span className="chat-call-share-badge">{text("screenSharing")}</span>}
              </div>
              <div className={`chat-call-video-self${callScreenSharing ? " chat-call-video-share" : ""}`}>
                <video
                  ref={localVideoRef}
                  className={`chat-call-video${localHasVideo ? " visible" : ""}`}
                  autoPlay
                  playsInline
                  muted
                  aria-label={text("youLabel")}
                />
                {!localHasVideo && <div className="chat-call-video-placeholder chat-call-video-self-placeholder">
                  <span>{ownName.slice(0, 1).toUpperCase()}</span>
                  <small>{callHeld ? text("callOnHoldLabel") : text("cameraOff")}</small>
                </div>}
                <span className="chat-call-video-name">{text("youLabel")}</span>
                {callScreenSharing && <span className="chat-call-share-badge">{text("screenSharing")}</span>}
              </div>
            </div>
            <audio
              className="chat-call-audio"
              ref={remoteAudioRef}
              autoPlay
              playsInline
              muted={callSpeakerMuted || callHeld}
              aria-hidden="true"
            />
            <div className="chat-call-controls" role="group" aria-label={text(callDetails?.videoSupported ? "videoCall" : "voiceCall")}>
              <button
                type="button"
                className={`chat-call-control-button${callCameraEnabled ? " selected" : ""}`}
                onClick={toggleCallCamera}
                disabled={!callCameraAvailable || callScreenSharing || callHeld}
                aria-label={text(!callCameraAvailable ? "cameraUnavailable" : callCameraEnabled ? "cameraOff" : "cameraOn")}
                aria-pressed={callCameraEnabled}
                title={callCameraAvailable ? text(callCameraEnabled ? "cameraOff" : "cameraOn") : text("cameraUnavailable")}
              ><span aria-hidden="true">▣</span><small>{text(callCameraEnabled ? "cameraOff" : "cameraOn")}</small></button>
              <button
                type="button"
                className={`chat-call-control-button${callMuted ? " selected" : ""}`}
                onClick={toggleCallMute}
                aria-label={text(callMuted ? "unmuteCall" : "muteCall")}
                aria-pressed={callMuted}
              ><span aria-hidden="true">🎙</span><small>{text(callMuted ? "unmuteCall" : "muteCall")}</small></button>
              <button
                type="button"
                className={`chat-call-control-button${callHeld ? " selected" : ""}`}
                onClick={toggleCallHold}
                disabled={callState !== "active"}
                aria-label={text(callHeld ? "resumeCall" : "holdCall")}
                aria-pressed={callHeld}
              ><span aria-hidden="true">{callHeld ? "▶" : "Ⅱ"}</span><small>{text(callHeld ? "resumeCall" : "holdCall")}</small></button>
              <div className="chat-call-more-wrap">
                <button
                  type="button"
                  className={`chat-call-control-button${callMoreOpen ? " selected" : ""}`}
                  onClick={() => setCallMoreOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={callMoreOpen}
                ><span aria-hidden="true">•••</span><small>{text("moreCallOptions")}</small></button>
                {callMoreOpen && <div className="chat-call-more-menu" role="menu">
                  <button type="button" role="menuitem" onClick={toggleCallSpeaker}>
                    <span aria-hidden="true">{callSpeakerMuted ? "🔇" : "🔊"}</span>
                    {text(callSpeakerMuted ? "speakerOn" : "speakerOff")}
                  </button>
                </div>}
              </div>
              <button
                type="button"
                className={`chat-call-control-button${callScreenSharing ? " selected" : ""}`}
                onClick={toggleCallScreenShare}
                disabled={callState !== "active" || (!callScreenSharing && (callHeld || !callVideoSupported))}
                aria-label={text(callScreenSharing ? "stopScreenShare" : "shareScreen")}
                aria-pressed={callScreenSharing}
              ><span aria-hidden="true">▤</span><small>{text(callScreenSharing ? "stopScreenShare" : "shareScreen")}</small></button>
              <button
                type="button"
                className={`chat-call-control-button chat-call-control-hangup${callCanBeCancelled ? " cancel" : ""}`}
                onClick={hangUpCall}
              ><span aria-hidden="true">☎</span><small>{text(callCanBeCancelled ? "cancelCall" : "endCall")}</small></button>
            </div>
          </section>
        </div>
      )}
      {incomingCall && callState === "incoming" && (
        <div className="chat-modal-backdrop" role="presentation">
          <section className="chat-tool-modal chat-incoming-call" role="dialog" aria-modal="true" aria-labelledby="incoming-call-title">
            <span className="chat-incoming-call-icon" aria-hidden="true">☎</span>
            <p className="chat-eyebrow">{text(callDetails?.videoSupported ? "videoCall" : "voiceCall")}</p>
            <h2 id="incoming-call-title">{text("incomingCall").replace("{name}", incomingCall.callerName)}</h2>
            <div className="chat-call-modal-actions">
              <button type="button" className="chat-primary-button" onClick={answerIncomingCall}>{text("answerCall")}</button>
              <button type="button" className="chat-call-end" onClick={declineIncomingCall}>{text("declineCall")}</button>
            </div>
          </section>
        </div>
      )}
      {callOutcome && (
        <div className="chat-modal-backdrop">
          <section className="chat-tool-modal chat-call-error-modal chat-call-outcome-modal" role="dialog" aria-modal="true" aria-labelledby="call-outcome-title" aria-describedby="call-outcome-description">
            <span className="chat-call-outcome-icon" aria-hidden="true">☎</span>
            <p className="chat-eyebrow">{text(callOutcome.kind === "video" ? "videoCall" : "voiceCall")}</p>
            <h2 id="call-outcome-title">{text("noAnswerTitle")}</h2>
            <p id="call-outcome-description">
              {text(callOutcome.missed
                ? callOutcome.kind === "video" ? "missedVideoCall" : "missedVoiceCall"
                : callOutcome.kind === "video" ? "videoCallNoAnswer" : "voiceCallNoAnswer"
              ).replace("{name}", callOutcome.name)}
            </p>
            <button type="button" className="chat-primary-button" onClick={() => setCallOutcome(null)}>{text("callErrorOk")}</button>
          </section>
        </div>
      )}
      {callError && (
        <div className="chat-modal-backdrop">
          <section className="chat-tool-modal chat-call-error-modal" role="alertdialog" aria-modal="true" aria-labelledby="call-error-title" aria-describedby="call-error-description">
            <span className="chat-call-error-icon" aria-hidden="true">!</span>
            <h2 id="call-error-title">{text("callErrorTitle")}</h2>
            <p id="call-error-description">{callError}</p>
            <button type="button" className="chat-primary-button" onClick={() => setCallError("")}>{text("callErrorOk")}</button>
          </section>
        </div>
      )}

      <div className={`chat-shell${mobileListOpen ? " chat-mobile-list-open" : ""}`}>
        <aside className={`chat-sidebar${contactPickerOpen ? " chat-sidebar-contacts" : ""}`}>
          <div className="chat-sidebar-heading">
            <div><p className="chat-eyebrow">{text("yourPeople")}</p><h1>{contactPickerOpen ? text("startChat") : text("messages")}</h1></div>
            <button type="button" className="chat-icon-button" onClick={() => { setContactPickerOpen((open) => !open); setDirectoryQuery(""); }} aria-label={text(contactPickerOpen ? "closeContacts" : "findPerson")} title={text("newChat")}>＋</button>
          </div>
          <div className="chat-sidebar-actions">
            <button type="button" className="chat-secondary-button" onClick={() => { setGroupKind("group"); setGroupDialogOpen(true); setContactPickerOpen(false); }}>👥 {text("newGroup")}</button>
            <button type="button" className="chat-secondary-button" onClick={() => { setGroupKind("community"); setGroupDialogOpen(true); setContactPickerOpen(false); }}>🌐 {text("newCommunity")}</button>
            <button type="button" className="chat-secondary-button" onClick={openSettings}>⚙ {text("privacySettings")}</button>
            <button type="button" className="chat-secondary-button" onClick={openSavedMessages}>★ {text("savedMessages")}</button>
            <button type="button" className="chat-secondary-button" onClick={openMediaManager}>▧ {text("mediaStorage")}</button>
            <button type="button" className="chat-secondary-button" onClick={openHistory}>↻ {text("manageHistory")}</button>
          </div>
          <nav className="chat-filter-tabs" aria-label={text("messages")}>
            {[
              ["inbox", "filterInbox"],
              ["unread", "filterUnread"],
              ["communities", "filterCommunities"],
              ["requests", "filterRequests"],
              ["spam", "filterSpam"],
              ["archived", "filterArchived"],
            ].map(([filter, label]) => (
              <button type="button" key={filter} className={conversationFilter === filter ? "selected" : ""} onClick={() => { setConversationFilter(filter); setContactPickerOpen(false); }}>
                {text(label)}
                {filter === "unread" && conversations.some((conversation) => !conversation.isArchived && !conversation.isSpam && conversation.unreadCount > 0) && <span>{conversations.filter((conversation) => !conversation.isArchived && !conversation.isSpam && conversation.unreadCount > 0).length}</span>}
                {filter === "requests" && conversations.some((conversation) => conversation.isRequest) && <span>{conversations.filter((conversation) => conversation.isRequest).length}</span>}
              </button>
            ))}
          </nav>
          {contactPickerOpen ? (
            <div className="chat-contact-picker">
              <label className="chat-search"><span aria-hidden="true">⌕</span><input value={directoryQuery} onChange={(event) => setDirectoryQuery(event.target.value)} placeholder={text("searchMembers")} aria-label={text("searchMembers")} /></label>
              <p className="chat-list-label">{text("registeredMembers")}</p>
              <p className="chat-photo-chat-hint">{text("startChatPhotoHint")}</p>
              <div className="chat-list-scroll">
                {filteredDirectory.map((profile) => (
                  <button type="button" className="chat-person-row" key={profile.id} onClick={() => openDirectChat(profile)}>
                    <Avatar profile={profile} />
                    <span className="chat-person-copy"><strong>{profile.display_name}</strong><small>{text("startPrivate")}</small></span>
                    <span className="chat-person-arrow">›</span>
                  </button>
                ))}
                {!filteredDirectory.length && <p className="chat-empty-list">{text("noMembers")} {text("joinChat")}</p>}
              </div>
            </div>
          ) : (
            <>
              <label className="chat-search"><span aria-hidden="true">⌕</span><input value={directoryQuery} onChange={(event) => setDirectoryQuery(event.target.value)} placeholder={text("searchChats")} aria-label={text("searchChats")} /></label>
              <p className="chat-list-label">{text(conversationFilter === "inbox" ? "recent" : `filter${conversationFilter[0].toUpperCase()}${conversationFilter.slice(1)}`)}</p>
              <div className="chat-list-scroll">
                {filteredConversations.map((conversation) => (
                  <div className="chat-conversation-item" key={conversation.id}>
                    <button type="button" className={`chat-conversation-row${conversation.id === activeConversationId ? " active" : ""}`} onClick={() => { setActiveConversationId(conversation.id); setMobileListOpen(false); }}>
                      <Avatar profile={conversation.otherMember?.profile} group={conversation.kind !== "direct"} />
                      <span className="chat-person-copy"><strong>{conversation.displayTitle}</strong><small>{conversation.kind !== "direct" ? text("members").replace("{count}", conversation.members.length) : text("privateConversation")}</small></span>
                      {conversation.unreadCount > 0 && <span className="chat-unread-badge">{conversation.unreadCount}</span>}
                      {conversation.members.some((member) => member.user_id !== userId && onlineUserIds.includes(member.user_id)) && <span className="chat-online-dot" title={text("onlineLabel")} />}
                    </button>
                    {conversation.kind === "direct" && (
                      <button
                        type="button"
                        className="chat-row-call-button"
                        onClick={() => startAudioCall(conversation)}
                        disabled={callState !== "idle" || !canCallConversation(conversation)}
                        aria-label={`${text("callButton")} ${conversation.displayTitle}${canCallConversation(conversation) ? "" : ` · ${text("callUnavailable")}`}`}
                        title={canCallConversation(conversation) ? `${text("callButton")} ${conversation.displayTitle}` : text("callUnavailable")}
                      >☎</button>
                    )}
                  </div>
                ))}
                {!filteredConversations.length && !loadingChat && <div className="chat-empty-list"><span>💬</span><strong>{text(conversations.length ? "emptyFilter" : "startHere")}</strong><p>{text(conversations.length ? "emptyFilter" : "startHereDescription")}</p></div>}
                {loadingChat && <div className="chat-empty-list">{text("loadingConversations")}</div>}
              </div>
            </>
          )}
          {pageError && <p className="chat-inline-alert" role="alert">{pageError}</p>}
          <div className="chat-sidebar-footer"><span className="chat-secure-dot" /> {text("privateConversation")} · MongoDB <Link href="/legacy/index.html#shop" target="_blank" rel="noreferrer">{text("marketplace")}</Link></div>
        </aside>

        <section className="chat-main" aria-label={text("messages")}>
          {activeConversation ? (
            <>
              <header className="chat-conversation-header">
                <div className="chat-conversation-identity">
                  <button type="button" className="chat-mobile-back" onClick={() => setMobileListOpen(true)} aria-label={text("backToConversations")}>‹</button>
                  <Avatar profile={headerProfile} group={activeConversation.kind !== "direct"} />
                  <div>
                    <h2>{activeConversation.displayTitle}</h2>
                    <p>{activeConversation.kind !== "direct"
                      ? (onlineCount
                        ? text("groupMembers").replace("{count}", activeConversation.members.length).replace("{online}", onlineCount)
                        : text("members").replace("{count}", activeConversation.members.length))
                      : onlineCount ? text("onlineNow") : text("privateConversation")}</p>
                    {activeConversation.kind === "community" && activeConversation.description && <small className="chat-community-description">{activeConversation.description}</small>}
                  </div>
                </div>
                <div className="chat-conversation-actions">
                  {canCallConversation(activeConversation)
                    && <button type="button" className="chat-call-button" onClick={startAudioCall} disabled={callState !== "idle"} aria-label={text("callButton")} title={text("callButton")}>☎ {text("callButton")}</button>}
                  {activeConversation.isRequest && <><button type="button" className="chat-secondary-button" onClick={acceptRequest}>{text("acceptRequest")}</button><button type="button" className="chat-secondary-button" onClick={() => changeConversation("request/spam")}>{text("markSpam")}</button></>}
                  {activeConversation.requestSent && <span>{text("requestNotice")}</span>}
                  {!activeConversation.isRequest && !activeConversation.requestSent && <button type="button" className="chat-secondary-button" onClick={() => changeConversation(activeConversation.isArchived || activeConversation.isSpam ? "unarchive" : "archive")}>{text(activeConversation.isArchived || activeConversation.isSpam ? "unarchiveChat" : "archiveChat")}</button>}
                  <span className="chat-live-indicator"><i /> {text("live")}</span>
                </div>
              </header>
              {pageError && <p className="chat-inline-alert" role="alert">{pageError}</p>}
              <div className="chat-messages">
                <div className="chat-message-date">{text("membersOnly")}</div>
                {messageState.hasMore && <button type="button" className="chat-load-older" onClick={loadOlderMessages} disabled={loadingOlder}>{loadingOlder ? "…" : text("loadOlderMessages")}</button>}
                {loadingMessages && <div className="chat-message-loading"><span className="chat-spinner" /> {text("loadingMessages")}</div>}
                {!loadingMessages && !messages.length && <div className="chat-first-message"><Avatar profile={headerProfile} group={activeConversation.kind !== "direct"} /><strong>{text("sayHello").replace("{name}", activeConversation.displayTitle)}</strong><p>{text("imagesAppear")}</p></div>}
                {messages.map((message) => (
                  <article id={`chat-message-${message.id}`} className={`chat-message${message.sender_id === userId ? " own" : ""}${message.is_deleted ? " deleted" : ""}`} key={message.id}>
                    {message.sender_id !== userId && activeConversation.kind !== "direct" && <span className="chat-message-sender">{message.sender?.display_name || text("teamMember")}</span>}
                    {message.is_deleted ? <p className="chat-message-deleted">{text("deletedMessage")}</p> : (
                      <>
                        {message.imageUrl && <a className="chat-message-image" href={message.imageUrl} target="_blank" rel="noreferrer"><Image src={message.imageUrl} alt={text("sharedInChat")} width={560} height={260} unoptimized /></a>}
                        {message.mediaUrl && message.mediaType.startsWith("video/") && <video className="chat-message-player" controls preload="metadata" src={message.mediaUrl} aria-label={text("videoAttachment")} />}
                        {message.mediaUrl && message.mediaType.startsWith("audio/") && <audio className="chat-message-player" controls preload="metadata" src={message.mediaUrl} aria-label={text("audioAttachment")} />}
                        {editingMessageId === message.id ? (
                          <form className="chat-message-edit-form" onSubmit={(event) => updateMessage(event, message.id)}>
                            <textarea value={editingMessageDraft} onChange={(event) => setEditingMessageDraft(event.target.value)} maxLength={4000} aria-label={text("editMessage")} autoFocus />
                            <div><button type="submit" className="chat-message-action-primary" disabled={Boolean(messageActionBusy) || !editingMessageDraft.trim()}>{text("saveChanges")}</button><button type="button" className="chat-message-action" onClick={cancelEditMessage}>{text("cancel")}</button></div>
                          </form>
                        ) : message.body && <p>{message.body}</p>}
                      </>
                    )}
                    <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
                    {message.edited && !message.is_deleted && <span className="chat-message-edited">{text("edited")}</span>}
                    {!message.is_deleted && <div className="chat-message-actions">
                      <MessageReactionControls
                        message={message}
                        onReact={toggleMessageReaction}
                        onOpen={setReactionTarget}
                        text={text}
                        disabled={Boolean(messageActionBusy)}
                      />
                      <button type="button" className="chat-message-action chat-message-save" onClick={() => toggleSavedMessage(message)} disabled={Boolean(messageActionBusy)} aria-label={text(message.is_saved ? "unsaveMessage" : "saveMessage")} aria-pressed={message.is_saved} title={text(message.is_saved ? "unsaveMessage" : "saveMessage")}>{message.is_saved ? "★" : "☆"}</button>
                      {message.body.trim() && <a className="chat-message-action chat-message-share" href={`https://wa.me/?text=${encodeURIComponent(message.body)}`} target="_blank" rel="noopener noreferrer" aria-label={text("shareOnWhatsApp")} title={text("shareOnWhatsApp")}>↗ WhatsApp</a>}
                      {message.sender_id === userId && message.body && <button type="button" className="chat-message-action" onClick={() => beginEditMessage(message)} disabled={Boolean(messageActionBusy)}>{text("editMessage")}</button>}
                      <button type="button" className="chat-message-action chat-message-delete" onClick={() => setDeleteTarget(message)} disabled={Boolean(messageActionBusy)}>{text("deleteMessage")}</button>
                    </div>}
                  </article>
                ))}
                <div ref={messageEndRef} />
              </div>
              {activeConversation.isRequest || activeConversation.requestSent || activeConversation.isSpam || activeConversation.requestBlocked ? (
                <p className="chat-request-notice">{text(activeConversation.requestBlocked ? "requestBlockedNotice" : activeConversation.requestSent ? "requestPendingNotice" : activeConversation.isSpam ? "filterSpam" : "requestNotice")}</p>
              ) : (
                <form className="chat-composer" onSubmit={sendMessage}>
                  {attachment && <div className="chat-attachment-preview">
                    {attachment.file.type.startsWith("image/") && <Image src={attachment.previewUrl} alt={text("selectedPreview")} width={34} height={34} unoptimized />}
                    {attachment.file.type.startsWith("video/") && <video src={attachment.previewUrl} muted />}
                    {attachment.file.type.startsWith("audio/") && <span aria-hidden="true">🎙️</span>}
                    <span>{attachment.file.name}</span>
                    <button type="button" onClick={() => setAttachment(null)} aria-label={text("removeImage")}>×</button>
                  </div>}
                  <div className="chat-composer-row">
                    <input ref={imageInputRef} className="chat-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mp4,audio/webm,audio/ogg,audio/mpeg,audio/wav" onChange={chooseImage} />
                    <input ref={photoUploadInputRef} className="chat-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseImage} />
                    <input ref={photoCaptureInputRef} className="chat-file-input" type="file" accept="image/*" capture="environment" onChange={chooseImage} />
                    <button type="button" className="chat-attach-button" onClick={() => imageInputRef.current?.click()} aria-label={text("attachMedia")} title={text("attachMedia")}>＋</button>
                    <button type="button" className="chat-photo-action-button" onClick={() => photoUploadInputRef.current?.click()}>{text("uploadPhoto")}</button>
                    <button type="button" className="chat-photo-action-button" onClick={() => photoCaptureInputRef.current?.click()}>{text("takePhoto")}</button>
                    {recordingType
                      ? <button type="button" className="chat-record-button recording" onClick={stopRecording}>{text("stopRecording")}</button>
                      : <><button type="button" className="chat-record-button" onClick={() => startRecording("audio")}>{text("recordAudio")}</button><button type="button" className="chat-record-button" onClick={() => startRecording("video")}>{text("recordVideo")}</button></>}
                    <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={text("writeMessage")} aria-label={text("writeMessage")} rows={1} maxLength={4000} />
                    <button className="chat-send-button" type="submit" disabled={sending || Boolean(recordingType) || (!draft.trim() && !attachment)} aria-label={text("sendMessage")}>{sending ? "…" : "➤"}</button>
                  </div>
                  <p className="chat-composer-hint">{text("composerHint")}</p>
                </form>
              )}
            </>
          ) : (
            <div className="chat-welcome">
              <div className="chat-welcome-art">💬</div>
              <p className="chat-eyebrow">{text("together")}</p>
              <h2>{text("welcomeHeadline")}</h2>
              <p>{text("welcomeDescription")}</p>
              <button type="button" className="chat-primary-button" onClick={() => setContactPickerOpen(true)}>{text("findPeople")}</button>
            </div>
          )}
        </section>
      </div>

      {profilePhotoDialogOpen && (
        <div className="chat-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfilePhotoDialogOpen(false); }}>
          <section className="chat-tool-modal chat-photo-modal" role="dialog" aria-modal="true" aria-labelledby="profile-photo-title">
            <button type="button" className="chat-modal-close" onClick={() => setProfilePhotoDialogOpen(false)} aria-label={text("closeModal")}>×</button>
            <h2 id="profile-photo-title">{text("changePhoto")}</h2>
            <div className="chat-photo-modal-preview"><Avatar profile={{ display_name: ownName, avatar_url: user.avatarUrl }} /></div>
            <button type="button" className="chat-primary-button" onClick={() => profilePhotoInputRef.current?.click()} disabled={uploadingPhoto}>{text("uploadPhoto")}</button>
            <button type="button" className="chat-secondary-button" onClick={() => profilePhotoCaptureInputRef.current?.click()} disabled={uploadingPhoto}>{text("takePhoto")}</button>
          </section>
        </div>
      )}
      {groupDialogOpen && (
        <div className="chat-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGroupDialogOpen(false); }}>
          <form className="chat-group-modal" onSubmit={createGroup} role="dialog" aria-modal="true" aria-labelledby="create-group-title">
            <button type="button" className="chat-modal-close" onClick={() => setGroupDialogOpen(false)} aria-label={text("closeModal")}>×</button>
            <p className="chat-eyebrow">{text("bringTogether")}</p><h2 id="create-group-title">{text(groupKind === "community" ? "createCommunity" : "createGroup")}</h2>
            <label className="chat-field-label">{text("groupName")}<input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} required maxLength={80} placeholder={text("groupNamePlaceholder")} /></label>
            {groupKind === "community" && <label className="chat-field-label">{text("communityDescription")}<textarea value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} maxLength={500} rows={3} /></label>}
            <p className="chat-field-label">{text("choosePeople")} <span>({text("selected").replace("{count}", groupMemberIds.length)})</span></p>
            <div className="chat-group-people">
              {directory.map((profile) => (
                <label className="chat-group-person" key={profile.id}>
                  <input type="checkbox" checked={groupMemberIds.includes(profile.id)} onChange={(event) => setGroupMemberIds((current) => event.target.checked ? [...current, profile.id] : current.filter((id) => id !== profile.id))} />
                  <Avatar profile={profile} small /><span>{profile.display_name}</span>
                </label>
              ))}
              {!directory.length && <p className="chat-empty-list">{text("noChatMembers")}</p>}
            </div>
            {pageError && <p className="chat-alert chat-alert-error" role="alert">{pageError}</p>}
            <button className="chat-primary-button chat-auth-submit" type="submit" disabled={!groupTitle.trim() || !groupMemberIds.length}>{text(groupKind === "community" ? "createCommunity" : "createGroupChat")}</button>
          </form>
        </div>
      )}
      {settingsOpen && (
        <div className="chat-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
          <form className="chat-tool-modal" onSubmit={saveSettings} role="dialog" aria-modal="true" aria-labelledby="privacy-title">
            <button type="button" className="chat-modal-close" onClick={() => setSettingsOpen(false)} aria-label={text("closeModal")}>×</button>
            <h2 id="privacy-title">{text("privacySettings")}</h2>
            <fieldset className="chat-display-settings">
              <legend>{text("displaySettings")}</legend>
              <label className="chat-display-label">
                <span>{text("displayBrightness")} <output>{displayPreferences.brightness}%</output></span>
                <input
                  type="range"
                  min="70"
                  max="130"
                  step="1"
                  value={displayPreferences.brightness}
                  onChange={(event) => setDisplayPreferences((current) => ({ ...current, brightness: Number(event.target.value) }))}
                />
              </label>
              <label className="chat-display-label chat-accent-label">
                <span>{text("accentColor")}</span>
                <input
                  type="color"
                  value={displayPreferences.accentColor}
                  onChange={(event) => setDisplayPreferences((current) => ({ ...current, accentColor: event.target.value }))}
                />
              </label>
              <p>{text("displayPageNote")}</p>
              <button type="button" className="chat-quiet-button" onClick={() => setDisplayPreferences(defaultDisplayPreferences)}>{text("resetDisplay")}</button>
            </fieldset>
            <label className="chat-field-label">{text("presenceVisibility")}
              <select value={settings.presenceVisibility} onChange={(event) => setSettings((current) => ({ ...current, presenceVisibility: event.target.value }))}>
                <option value="everyone">{text("presenceEveryone")}</option>
                <option value="contacts">{text("presenceContacts")}</option>
                <option value="nobody">{text("presenceNobody")}</option>
              </select>
            </label>
            <label className="chat-setting-check"><input type="checkbox" checked={settings.allowMessageRequests} onChange={(event) => setSettings((current) => ({ ...current, allowMessageRequests: event.target.checked }))} /> {text("allowRequests")}</label>
            {pageError && <p className="chat-alert chat-alert-error" role="alert">{pageError}</p>}
            <button className="chat-primary-button chat-auth-submit" type="submit" disabled={settingsSaving}>{settingsSaving ? text("pleaseWait") : text("saveSettings")}</button>
          </form>
        </div>
      )}
      {deleteTarget && (
        <div className="chat-modal-backdrop" role="presentation">
          <section className="chat-tool-modal chat-delete-message-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-message-title" aria-describedby="delete-message-description">
            <span className="chat-delete-message-icon" aria-hidden="true">×</span>
            <p className="chat-eyebrow">{text("deleteMessage")}</p>
            <h2 id="delete-message-title">{text("deleteMessageTitle")}</h2>
            <p id="delete-message-description">{text(deleteTarget.sender_id === userId ? "deleteMessageDescriptionOwn" : "deleteMessageDescriptionOther")}</p>
            <div className="chat-delete-message-preview">
              {deleteTarget.body
                || (deleteTarget.imageUrl ? text("imageAttachment")
                  : deleteTarget.mediaType.startsWith("video/") ? text("videoAttachment")
                    : text("audioAttachment"))}
            </div>
            {pageError && <p className="chat-alert chat-alert-error" role="alert">{pageError}</p>}
            <div className="chat-delete-message-actions">
              <button type="button" className="chat-secondary-button" onClick={() => setDeleteTarget(null)} disabled={Boolean(messageActionBusy)}>{text("cancel")}</button>
              <button type="button" className="chat-delete-message-for-me" onClick={() => deleteMessage(deleteTarget, "me")} disabled={Boolean(messageActionBusy)}>{text("deleteForMe")}</button>
              {deleteTarget.sender_id === userId && <button type="button" className="chat-delete-message-for-everyone" onClick={() => deleteMessage(deleteTarget, "everyone")} disabled={Boolean(messageActionBusy)}>{text("deleteForEveryone")}</button>}
            </div>
          </section>
        </div>
      )}
      {reactionTarget && (
        <div className="chat-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReactionTarget(null); }}>
          <section className="chat-tool-modal chat-emoji-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="reaction-picker-title">
            <button type="button" className="chat-modal-close" onClick={() => setReactionTarget(null)} aria-label={text("closeModal")}>×</button>
            <h2 id="reaction-picker-title">{text("reactToMessage")}</h2>
            {pageError && <p className="chat-alert chat-alert-error" role="alert">{pageError}</p>}
            <EmojiPicker
              onEmojiClick={(emojiData) => toggleMessageReaction(reactionTarget, emojiData.emoji)}
              autoFocusSearch={false}
              lazyLoadEmojis
              colorScheme="light"
              labels={{ searchPlaceholder: text("searchReactions"), searchLabel: text("searchReactions") }}
              width="min(320px, 85vw)"
              height={360}
              previewConfig={{ showPreview: false }}
            />
          </section>
        </div>
      )}
      {savedOpen && (
        <div className="chat-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSavedOpen(false); }}>
          <section className="chat-tool-modal" role="dialog" aria-modal="true" aria-labelledby="saved-messages-title">
            <button type="button" className="chat-modal-close" onClick={() => setSavedOpen(false)} aria-label={text("closeModal")}>×</button>
            <h2 id="saved-messages-title">{text("savedMessages")}</h2>
            {pageError && <p className="chat-alert chat-alert-error" role="alert">{pageError}</p>}
            <div className="chat-tool-list">
              {savedMessages.map((message) => (
                <div className="chat-tool-list-row chat-saved-message-row" key={message.id}>
                  <button type="button" className="chat-saved-message-open" onClick={() => openSavedConversation(message)}>
                    <strong>{message.conversation_title || text("messages")}</strong>
                    <small>{message.sender?.display_name || ownName} · {new Date(message.created_at).toLocaleString()}</small>
                    <span>{message.body || (message.imageUrl ? text("imageAttachment") : message.mediaType.startsWith("video/") ? text("videoAttachment") : text("audioAttachment"))}</span>
                  </button>
                  <MessageReactionControls
                    message={message}
                    onReact={toggleMessageReaction}
                    onOpen={setReactionTarget}
                    text={text}
                    disabled={Boolean(messageActionBusy)}
                  />
                  {message.body.trim() && <a className="chat-message-action chat-message-share" href={`https://wa.me/?text=${encodeURIComponent(message.body)}`} target="_blank" rel="noopener noreferrer" aria-label={text("shareOnWhatsApp")} title={text("shareOnWhatsApp")}>↗ WhatsApp</a>}
                  <button type="button" className="chat-quiet-button" onClick={() => toggleSavedMessage(message)} disabled={Boolean(messageActionBusy)}>{text("unsaveMessage")}</button>
                  <button type="button" className="chat-quiet-button chat-message-delete" onClick={() => setDeleteTarget(message)} disabled={Boolean(messageActionBusy)}>{text("deleteMessage")}</button>
                </div>
              ))}
              {savedLoading && <div className="chat-message-loading"><span className="chat-spinner" /> {text("loadingMessages")}</div>}
              {!savedLoading && !savedMessages.length && <p className="chat-empty-list">{text("noSavedMessages")}</p>}
            </div>
            {savedHasMore && <button type="button" className="chat-primary-button" onClick={loadMoreSavedMessages} disabled={savedLoading}>{savedLoading ? text("pleaseWait") : text("loadOlderMessages")}</button>}
          </section>
        </div>
      )}
      {mediaOpen && (
        <div className="chat-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMediaOpen(false); }}>
          <section className="chat-tool-modal" role="dialog" aria-modal="true" aria-labelledby="media-title">
            <button type="button" className="chat-modal-close" onClick={() => setMediaOpen(false)} aria-label={text("closeModal")}>×</button>
            <p className="chat-eyebrow">{text("mediaUsage").replace("{size}", formatBytes(mediaBytes))}</p><h2 id="media-title">{text("mediaStorage")}</h2>
            {pageError && <p className="chat-alert chat-alert-error" role="alert">{pageError}</p>}
            <div className="chat-tool-list">
              {mediaItems.map((item) => (
                <div className="chat-tool-list-row" key={`${item.messageId}-${item.kind}`}>
                  <a href={item.url} target="_blank" rel="noreferrer"><strong>{item.fileName || item.kind}</strong><small>{item.conversationTitle} · {formatBytes(item.size)} · {new Date(item.createdAt).toLocaleDateString()}</small></a>
                  <button type="button" className="chat-quiet-button" onClick={() => { if (window.confirm(text("confirmDeleteMedia"))) deleteMedia(item.messageId); }}>{text("deleteMedia")}</button>
                </div>
              ))}
              {!mediaItems.length && <p className="chat-empty-list">{text("noMedia")}</p>}
            </div>
          </section>
        </div>
      )}
      {historyOpen && (
        <div className="chat-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryOpen(false); }}>
          <section className="chat-tool-modal" role="dialog" aria-modal="true" aria-labelledby="history-title">
            <button type="button" className="chat-modal-close" onClick={() => setHistoryOpen(false)} aria-label={text("closeModal")}>×</button>
            <h2 id="history-title">{text("manageHistory")}</h2>
            <p className="chat-tool-warning">{text("backupWarning")}</p>
            {pageError && <p className="chat-alert chat-alert-error" role="alert">{pageError}</p>}
            <button type="button" className="chat-primary-button" onClick={createBackup} disabled={historyBusy}>{historyBusy ? text("pleaseWait") : text("createBackup")}</button>
            <div className="chat-tool-list">
              {backups.map((backup) => (
                <div className="chat-tool-list-row" key={backup.id}>
                  <span><strong>{new Date(backup.createdAt).toLocaleString()}</strong><small>{backup.conversationCount} chats · {backup.messageCount} messages</small></span>
                  <div><button type="button" className="chat-quiet-button" onClick={() => restoreBackup(backup.id)} disabled={historyBusy}>{text("restoreBackup")}</button><button type="button" className="chat-quiet-button" onClick={() => deleteBackup(backup.id)}>{text("deleteBackup")}</button></div>
                </div>
              ))}
              {!backups.length && <p className="chat-empty-list">{text("noBackups")}</p>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
