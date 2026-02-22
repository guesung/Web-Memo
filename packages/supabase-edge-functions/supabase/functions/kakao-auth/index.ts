import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { kakao_access_token } = await req.json();

    if (!kakao_access_token) {
      return new Response(
        JSON.stringify({ error: "kakao_access_token is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 1. 카카오 API로 access token 검증 및 사용자 정보 조회
    const kakaoRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${kakao_access_token}` },
    });

    if (!kakaoRes.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid Kakao token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const kakaoUser = await kakaoRes.json();
    const email = kakaoUser.kakao_account?.email;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email not available from Kakao account" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Supabase Admin 클라이언트 생성
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 3. 기존 사용자에 대해 magiclink 토큰 생성 시도
    let { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    // 4. 사용자가 없으면 생성 후 재시도
    if (linkError) {
      const nickname =
        kakaoUser.properties?.nickname ??
        kakaoUser.kakao_account?.profile?.nickname;
      const avatarUrl =
        kakaoUser.properties?.profile_image ??
        kakaoUser.kakao_account?.profile?.profile_image_url;

      const { error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            name: nickname,
            avatar_url: avatarUrl,
            provider: "kakao",
            kakao_id: String(kakaoUser.id),
          },
        });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const retryResult = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      linkData = retryResult.data;
      linkError = retryResult.error;
    }

    if (linkError || !linkData) {
      return new Response(
        JSON.stringify({
          error: linkError?.message ?? "Failed to generate auth link",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        email,
        token: linkData.properties.hashed_token,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
