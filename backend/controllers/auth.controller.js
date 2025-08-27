const supabase = require("../utils/supabaseClient");

exports.login = async (req, res) => {
  const body = req.body;
  const email = body?.email;
  const password = body?.password;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw authError;

    const { user } = authData;
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("full_name, role, institution_id")
      .eq("id", user.id)
      .single();

    if (userError) throw userError;

    res.status(200).json({
      message: "Login successful",
      token: authData.session.access_token,
      user: {
        uid: user.id,
        email: user.email,
        ...userData,
      },
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

exports.register = async (req, res) => {
  const { email, password, full_name, role, institution_id } = req.body;
  if (!email || !password || !full_name || !role || !institution_id) {
    return res.status(400).json({
      error: "All fields are required (email, full_name, role, institution_id)",
    });
  }
  try {
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { full_name },
      });
    if (authError) throw authError;

    const uid = authData.user.id;
    await supabase
      .from("users")
      .insert([{ uid, email, full_name, role, institution_id }]);

    res.status(201).json({ message: "User created", uid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
