const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

// Load .env from backend
dotenv.config({
  path: "c:/Users/mbugu/OneDrive/Desktop/Code/React/Cloudora_LMS/backend/.env",
});

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const userId = "5392d979-e70a-4017-a340-502ea5706d41"; // Demo Parent
  console.log("Testing query for userId:", userId);

  const { data, error } = await supabase
    .from("users")
    .select(
      `
          id, 
          institution_id, 
          role,
          admins!user_id(is_master)
        `,
    )
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Query Data:", JSON.stringify(data, null, 2));
  }
}

test();
