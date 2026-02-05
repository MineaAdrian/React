export type Language = "en" | "ro";

export type TranslationKey =
    // Nav
    | "nav_menu"
    | "nav_recipes"
    | "nav_shopping"
    | "nav_profile"
    | "nav_signout"
    // Week
    | "week_previous"
    | "week_this"
    | "week_next"
    | "week_loading"
    | "menu_daily_menu"
    | "meal_remove_confirm"
    | "assign_recipe"
    | "all_meal_types"
    | "clear_slot"
    | "close"
    // Meals
    | "breakfast"
    | "lunch"
    | "dinner"
    | "togo"
    | "dessert"
    // Recipes
    | "recipes_title"
    | "recipes_subtitle"
    | "recipes_add_new"
    | "recipes_cancel"
    | "recipes_search_placeholder"
    | "recipes_create"
    | "recipes_edit"
    | "recipes_family_only"
    | "recipes_no_family"
    | "recipes_name"
    | "recipes_name_ro"
    | "recipes_name_placeholder"
    | "recipes_meal_type"
    | "recipes_photo"
    | "recipes_select_photo"
    | "recipes_photo_url_placeholder"
    | "recipes_instructions"
    | "recipes_instructions_ro"
    | "recipes_instructions_placeholder"
    | "recipes_ingredients"
    | "recipes_add_item"
    | "recipes_ing_name"
    | "recipes_qty"
    | "recipes_unit"
    | "recipes_uploading"
    | "recipes_update"
    | "recipes_save"
    | "recipes_not_found"
    | "recipes_empty"
    // Recipe View
    | "recipe_view_edit"
    | "recipe_view_family"
    | "recipe_view_method"
    | "recipe_view_close"
    | "recipe_time"
    | "recipe_mins"
    | "recipe_level"
    | "recipe_type"
    | "easy"
    | "medium"
    | "hard"
    | "recipe_report_prompt"
    | "recipe_edit_hint"
    | "recipe_report_title"
    // Shopping
    | "shopping_title"
    | "shopping_live"
    | "shopping_not_live"
    | "shopping_refreshing"
    | "shopping_refresh_button"
    | "shopping_empty"
    | "shopping_subtitle"
    | "shopping_toggle_failed"
    | "shopping_add_item"
    | "shopping_add_action"
    | "shopping_add_action"
    | "shopping_adding"
    // Menu / Week View
    | "menu_selected_recipe"
    | "menu_pantry_check"
    | "menu_cooking_mode"
    | "menu_kitchen_guide"
    | "menu_select_recipe"
    | "menu_method"
    | "menu_no_instructions"
    // Settings
    | "settings_profile"
    | "settings_family"
    | "settings_join"
    | "settings_add_member"
    | "settings_invite_id"
    | "settings_my_profile"
    | "settings_your_name"
    | "settings_save_changes"
    | "settings_saved"
    | "settings_family_label"
    | "settings_join_requests"
    | "settings_approve"
    | "settings_decline"
    | "settings_remove_member"
    | "settings_no_family_hint"
    | "settings_invited_title"
    | "settings_invited_to_join"
    | "settings_accept"
    | "settings_ignore"
    | "settings_invite_new"
    | "settings_send_invite_hint"
    | "settings_share_id_hint"
    | "settings_request_join"
    | "settings_paste_id_hint"
    | "settings_sending_invite"
    | "settings_invite_sent"
    | "settings_sending_request"
    | "settings_request_sent"
    | "settings_approval_hint";

export const translations: Record<Language, Record<TranslationKey, string>> = {
    en: {
        nav_menu: "Week Menu",
        nav_recipes: "Recipes",
        nav_shopping: "Shopping List",
        nav_profile: "Settings",
        nav_signout: "Sign out",
        week_previous: "Previous week",
        week_this: "This week",
        week_next: "Next week",
        week_loading: "Loading week...",
        menu_daily_menu: "Daily Menu",
        meal_remove_confirm: "Remove this meal from the plan?",
        assign_recipe: "Assign recipe",
        all_meal_types: "All meal types",
        clear_slot: "Clear slot",
        close: "Close",
        breakfast: "Breakfast",
        lunch: "Lunch",
        dinner: "Dinner",
        togo: "To-Go",
        dessert: "Dessert",
        recipes_title: "Recipes",
        recipes_subtitle: "Community & Family kitchen",
        recipes_add_new: "Add New Recipe",
        recipes_cancel: "Cancel",
        recipes_search_placeholder: "Search recipes by name or ingredient...",
        recipes_create: "Create New Recipe",
        recipes_edit: "Edit Recipe",
        recipes_family_only: "Family recipes",
        recipes_no_family: "No family joined yet",
        recipes_name: "Name",
        recipes_name_ro: "Name (RO)",
        recipes_name_placeholder: "e.g. Pasta carbonara",
        recipes_meal_type: "Meal type",
        recipes_photo: "Recipe Photo",
        recipes_select_photo: "Select Photo",
        recipes_photo_url_placeholder: "Or paste image URL here...",
        recipes_instructions: "Instructions",
        recipes_instructions_ro: "Instructions (RO)",
        recipes_instructions_placeholder: "Step 1: ...",
        recipes_ingredients: "Ingredients",
        recipes_add_item: "Add Item",
        recipes_ing_name: "Ingredient Name",
        recipes_qty: "Qty",
        recipes_unit: "Unit",
        recipes_uploading: "Uploading...",
        recipes_update: "Update Recipe",
        recipes_save: "Save Recipe",
        recipes_not_found: "No recipes found matching",
        recipes_empty: "Your kitchen is empty. Add your first recipe!",
        recipe_view_edit: "Edit",
        recipe_view_family: "Family Recipe",
        recipe_view_method: "Method",
        recipe_view_close: "Close View",
        recipe_time: "Time",
        recipe_mins: "mins",
        recipe_level: "Level",
        recipe_type: "Type",
        easy: "Easy",
        medium: "Medium",
        hard: "Hard",
        shopping_title: "Shopping List",
        shopping_live: "Live Sync",
        shopping_not_live: "Offline",
        shopping_refreshing: "Refreshing...",
        shopping_refresh_button: "Refresh",
        shopping_empty: "Plan some meals for this week to generate the shopping list.",
        shopping_subtitle: "Check items as you shop. Changes sync in real time for everyone.",
        shopping_toggle_failed: "Failed to update item. Please try again.",
        shopping_add_item: "Add manual item",
        shopping_add_action: "Add to List",
        shopping_adding: "Adding...",
        menu_selected_recipe: "Selected Recipe",
        menu_pantry_check: "Pantry Check",
        menu_cooking_mode: "Cooking Mode",
        menu_kitchen_guide: "Kitchen Guide",
        menu_select_recipe: "Select a meal on the left to view the master recipe.",
        menu_method: "The Method",
        menu_no_instructions: "No instructions provided.",
        settings_profile: "Profile",
        settings_family: "Family",
        settings_join: "Join Family",
        settings_add_member: "Add Member",
        settings_invite_id: "Invite (ID)",
        settings_my_profile: "My Profile",
        settings_your_name: "Your Name",
        settings_save_changes: "Save Changes",
        settings_saved: "Saved",
        settings_family_label: "Family",
        settings_join_requests: "Join Requests",
        settings_approve: "Approve",
        settings_decline: "Decline",
        settings_remove_member: "Remove",
        settings_no_family_hint: "You are not in a family. Use the \"Join Family\" tab to get started.",
        settings_invited_title: "You're Invited!",
        settings_invited_to_join: "You were invited to join",
        settings_accept: "Accept",
        settings_ignore: "Ignore",
        settings_invite_new: "Invite New Member",
        settings_send_invite_hint: "Send an invitation to join your family.",
        settings_share_id_hint: "Give this ID to your family members so they can request to join:",
        settings_request_join: "Request to Join",
        settings_paste_id_hint: "Paste the Family ID shared by your admin.",
        settings_sending_invite: "Inviting...",
        settings_invite_sent: "Invitation Sent!",
        settings_sending_request: "Sending Request...",
        settings_request_sent: "Request Sent!",
        settings_approval_hint: "The family admin must approve your request before you can see their planner.",
        recipe_report_prompt: "Why are you reporting this recipe? (e.g. incorrect ingredients, typo, offensive)",
        recipe_edit_hint: "Edit recipe (Available for 5 mins after creation)",
        recipe_report_title: "Report issue"
    },
    ro: {
        nav_menu: "Meniu Săptămânal",
        nav_recipes: "Rețete",
        nav_shopping: "Listă Cumpărături",
        nav_profile: "Setări",
        nav_signout: "Deconectare",
        week_previous: "Săptămâna trecută",
        week_this: "Săptămâna aceasta",
        week_next: "Săptămâna viitoare",
        week_loading: "Se încarcă săptămâna...",
        menu_daily_menu: "Meniu Zilnic",
        meal_remove_confirm: "Elimini această masă din plan?",
        assign_recipe: "Alocă rețetă",
        all_meal_types: "Toate tipurile",
        clear_slot: "Golire slot",
        close: "Închide",
        breakfast: "Micul Dejun",
        lunch: "Prânz",
        dinner: "Cină",
        togo: "La Pachet",
        dessert: "Desert",
        recipes_title: "Rețete",
        recipes_subtitle: "Bucătăria comunității și a familiei",
        recipes_add_new: "Adaugă Rețetă",
        recipes_cancel: "Anulează",
        recipes_search_placeholder: "Caută rețete după nume sau ingrediente...",
        recipes_create: "Creează Rețetă Nouă",
        recipes_edit: "Editează Rețetă",
        recipes_family_only: "Rețetele familiei",
        recipes_no_family: "Nicio familie conectată",
        recipes_name: "Nume",
        recipes_name_ro: "Nume (RO)",
        recipes_name_placeholder: "ex. Paste carbonara",
        recipes_meal_type: "Tip de masă",
        recipes_photo: "Poză Rețetă",
        recipes_select_photo: "Selectează Poză",
        recipes_photo_url_placeholder: "Sau inserează URL imagine...",
        recipes_instructions: "Instrucțiuni",
        recipes_instructions_ro: "Instrucțiuni (RO)",
        recipes_instructions_placeholder: "Pasul 1: ...",
        recipes_ingredients: "Ingrediente",
        recipes_add_item: "Adaugă Element",
        recipes_ing_name: "Nume Ingredient",
        recipes_qty: "Cant",
        recipes_unit: "Unit",
        recipes_uploading: "Se încarcă...",
        recipes_update: "Actualizează Rețetă",
        recipes_save: "Salvează Rețetă",
        recipes_not_found: "Nicio rețetă găsită pentru",
        recipes_empty: "Bucătăria ta e goală. Adaugă prima rețetă!",
        recipe_view_edit: "Editează",
        recipe_view_family: "Rețetă de Familie",
        recipe_view_method: "Mod de preparare",
        recipe_view_close: "Închide Vizualizarea",
        recipe_time: "Timp",
        recipe_mins: "min",
        recipe_level: "Nivel",
        recipe_type: "Tip",
        easy: "Ușor",
        medium: "Mediu",
        hard: "Greu",
        shopping_title: "Listă Cumpărături",
        shopping_live: "Sync Live",
        shopping_not_live: "Offline",
        shopping_refreshing: "Se reîmprospătează...",
        shopping_refresh_button: "Refresh",
        shopping_empty: "Planifică mese pentru această săptămână pentru a genera lista.",
        shopping_subtitle: "Bifează produsele pe măsură ce cumperi. Modificările se sincronizează în timp real.",
        shopping_toggle_failed: "Actualizarea a eșuat. Te rugăm să încerci din nou.",
        shopping_add_item: "Adaugă element manual",
        shopping_add_action: "Adaugă la Listă",
        shopping_adding: "Se adaugă...",
        menu_selected_recipe: "Rețeta Selectată",
        menu_pantry_check: "Verificare Cămară",
        menu_cooking_mode: "Mod Gătit",
        menu_kitchen_guide: "Ghid Bucătărie",
        menu_select_recipe: "Selectează o masă din stânga pentru a vedea rețeta.",
        menu_method: "Metoda",
        menu_no_instructions: "Fără instrucțiuni.",
        settings_profile: "Profil",
        settings_family: "Familie",
        settings_join: "Alătură-te",
        settings_add_member: "Adaugă Membru",
        settings_invite_id: "Invită (ID)",
        settings_my_profile: "Profilul Meu",
        settings_your_name: "Numele Tău",
        settings_save_changes: "Salvează Modificările",
        settings_saved: "Salvat",
        settings_family_label: "Familia",
        settings_join_requests: "Cereri de înscriere",
        settings_approve: "Aprobă",
        settings_decline: "Refuză",
        settings_remove_member: "Elimină",
        settings_no_family_hint: "Nu ești într-o familie. Folosește tab-ul \"Alătură-te\" pentru a începe.",
        settings_invited_title: "Ai o invitație!",
        settings_invited_to_join: "Ai fost invitat să te alături",
        settings_accept: "Acceptă",
        settings_ignore: "Ignoră",
        settings_invite_new: "Invită Membru Nou",
        settings_send_invite_hint: "Trimite o invitație pentru a se alătura familiei tale.",
        settings_share_id_hint: "Oferă acest ID membrilor familiei pentru ca aceștia să poată solicita înscrierea:",
        settings_request_join: "Cerere de înscriere",
        settings_paste_id_hint: "Lipește ID-ul familiei primit de la admin.",
        settings_sending_invite: "Se trimite...",
        settings_invite_sent: "Invitație Trimisă!",
        settings_sending_request: "Se trimite cererea...",
        settings_request_sent: "Cerere Trimisă!",
        settings_approval_hint: "Administratorul familiei trebuie să aprobe cererea înainte de a vedea planificatorul.",
        recipe_report_prompt: "De ce raportezi această rețetă? (ex. ingrediente incorecte, greșeală, conținut ofensator)",
        recipe_edit_hint: "Editează rețeta (Disponibil 5 min de la creare)",
        recipe_report_title: "Raportează problemă"
    }
};
