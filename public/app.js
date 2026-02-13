if (window.__alfajorAppInitialized) {
  console.warn("Alfajor app ya inicializada");
} else {
  window.__alfajorAppInitialized = true;

  (function () {
    const SUPABASE_URL = "https://eedoapedfzikyytoskjz.supabase.co";
    const SUPABASE_ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZG9hcGVkZnppa3l5dG9za2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Mzk0NTQsImV4cCI6MjA4NjUxNTQ1NH0.SGn3QdWwvJjdv3mF1ZlWoYaTq1zmtvafE2pGUPtzIFY";
    const TABLE = "alfajor";

    const MAX_DIGITS = 10;
    const MAX_VALUE = 2147483647;
    const DIGITS_RE = /^\d{1,10}$/;

    const createForm = document.getElementById("create-form");
    const createInput = document.getElementById("create-lechuga");
    const createError = document.getElementById("create-error");
    const listEl = document.getElementById("list");
    const statusEl = document.getElementById("status");

    let live = false;
    let currentStatus = "";

    const setStatus = (message) => {
      currentStatus = message || "";
      if (!statusEl) return;
      if (live) {
        statusEl.textContent = currentStatus
          ? `En vivo · ${currentStatus}`
          : "En vivo";
        return;
      }
      statusEl.textContent = currentStatus;
    };

    const sanitizeDigits = (value) =>
      value.replace(/\D/g, "").slice(0, MAX_DIGITS);

    const validateDigits = (value) => {
      if (!value) return "lechuga requerida";
      if (!DIGITS_RE.test(value)) return "solo numeros, max 10 digitos";
      const numeric = Number(value);
      if (!Number.isSafeInteger(numeric)) return "lechuga invalida";
      if (numeric > MAX_VALUE) return "maximo permitido: 2147483647";
      return "";
    };

    if (!window.supabase) {
      setStatus("No se pudo cargar Supabase");
      throw new Error("Supabase no disponible");
    }

    const supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 5 } }
      }
    );

    const normalizeSupabaseError = (error) => {
      if (!error) return "error inesperado";
      const message = String(error.message || "");
      const details = String(error.details || "");
      const combined = `${message} ${details}`.toLowerCase();

      if (error.code === "22003" || combined.includes("out of range")) {
        return "lechuga fuera de rango (max 10 digitos)";
      }
      if (error.code === "23514" || combined.includes("check constraint")) {
        return "lechuga fuera de rango";
      }
      if (error.code === "22P02" || combined.includes("invalid input")) {
        return "lechuga invalida";
      }
      if (error.code === "42501" || combined.includes("permission")) {
        return "permiso denegado";
      }
      return message || "error inesperado";
    };

    const ensureOk = (result) => {
      if (result.error) {
        throw new Error(normalizeSupabaseError(result.error));
      }
      return result.data;
    };

    const loadList = async () => {
      try {
        setStatus("Cargando...");
        const result = await supabaseClient
          .from(TABLE)
          .select("id, lechuga")
          .order("id", { ascending: true });

        const data = ensureOk(result) || [];
        renderList(data);
        setStatus(data.length ? `${data.length} registros` : "Sin registros");
      } catch (error) {
        setStatus("");
        listEl.textContent = "";
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = error.message || "error inesperado";
        listEl.appendChild(empty);
      }
    };

    const bindNumericInput = (input, errorEl) => {
      const handler = () => {
        const sanitized = sanitizeDigits(input.value);
        if (input.value !== sanitized) input.value = sanitized;
        if (errorEl) errorEl.textContent = validateDigits(input.value);
      };
      input.addEventListener("input", handler);
      handler();
    };

    createForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const value = sanitizeDigits(createInput.value);
      createInput.value = value;
      const validation = validateDigits(value);
      createError.textContent = validation;
      if (validation) return;

      const submitButton = createForm.querySelector("button");
      submitButton.disabled = true;

      try {
        const lechuga = Number(value);
        const result = await supabaseClient
          .from(TABLE)
          .insert({ lechuga })
          .select("id, lechuga")
          .single();
        ensureOk(result);
        createInput.value = "";
        createError.textContent = "";
        await loadList();
      } catch (error) {
        createError.textContent = error.message || "error inesperado";
      } finally {
        submitButton.disabled = false;
      }
    });

    const renderList = (items) => {
      listEl.textContent = "";
      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "Aun no hay registros.";
        listEl.appendChild(empty);
        return;
      }

      items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "row";

        const id = document.createElement("div");
        id.className = "row-id";
        id.textContent = `#${item.id}`;

        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = "numeric";
        input.pattern = "[0-9]*";
        input.maxLength = MAX_DIGITS;
        input.value = String(item.lechuga ?? "");

        const actions = document.createElement("div");
        actions.className = "row-actions";

        const updateButton = document.createElement("button");
        updateButton.type = "button";
        updateButton.textContent = "Actualizar";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "danger";
        deleteButton.textContent = "Eliminar";

        const rowError = document.createElement("p");
        rowError.className = "row-error";
        rowError.setAttribute("role", "alert");

        actions.append(updateButton, deleteButton);
        row.append(id, input, actions, rowError);
        listEl.appendChild(row);

        bindNumericInput(input, rowError);

        updateButton.addEventListener("click", async () => {
          const value = sanitizeDigits(input.value);
          input.value = value;
          const validation = validateDigits(value);
          rowError.textContent = validation;
          if (validation) return;

          updateButton.disabled = true;
          deleteButton.disabled = true;

          try {
            const lechuga = Number(value);
            const result = await supabaseClient
              .from(TABLE)
              .update({ lechuga })
              .eq("id", item.id)
              .select("id, lechuga")
              .single();
            ensureOk(result);
            rowError.textContent = "Actualizado";
            await loadList();
          } catch (error) {
            rowError.textContent = error.message || "error inesperado";
          } finally {
            updateButton.disabled = false;
            deleteButton.disabled = false;
          }
        });

        deleteButton.addEventListener("click", async () => {
          rowError.textContent = "";
          updateButton.disabled = true;
          deleteButton.disabled = true;

          try {
            const result = await supabaseClient
              .from(TABLE)
              .delete()
              .eq("id", item.id);
            ensureOk(result);
            await loadList();
          } catch (error) {
            rowError.textContent = error.message || "error inesperado";
          } finally {
            updateButton.disabled = false;
            deleteButton.disabled = false;
          }
        });
      });
    };

    const subscribeToChanges = () => {
      supabaseClient
        .channel("alfajor-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: TABLE },
          () => loadList()
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            live = true;
            setStatus(currentStatus);
          }
        });
    };

    bindNumericInput(createInput, createError);
    loadList();
    subscribeToChanges();
  })();
}
