<template>
    <div class="login-wrapper">
        <button
                class="theme-toggle"
                type="button"
                :title="colorMode === 'dark' ? '切換為淺色模式' : '切換為深色模式'"
                @click="toggleColorMode"
        >
            <span v-if="colorMode === 'dark'">☀️</span>
            <span v-else>🌙</span>
        </button>

        <div class="login-card">
            <div class="login-header">
                <h2>聖母健康農莊</h2>
                <p>行事曆管理系統</p>
            </div>

            <form @submit.prevent="handleLogin">
                <div class="form-group">
                    <label>員工編號</label>
                    <input
                            v-model="form.u"
                            type="text"
                            placeholder="請輸入員工編號"
                            required
                            autocomplete="username"
                    />
                </div>
                <div class="form-group">
                    <label>密碼</label>
                    <input
                            v-model="form.p"
                            type="password"
                            placeholder="請輸入密碼"
                            required
                            autocomplete="current-password"
                    />
                </div>

                <div class="form-group remember-row">
                    <label class="remember-label">
                        <input type="checkbox" v-model="rememberMe" />
                        記住帳號密碼
                    </label>
                </div>

                <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

                <button type="submit" :disabled="loading" class="btn-login">
                    {{ loading ? '登入中...' : '登入' }}
                </button>
            </form>

            <div class="login-footer">
                <p>諮詢：請撥分機 202、203、204</p>
                <p>忘記密碼請聯絡分機 127</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    definePageMeta({ layout: 'staff', requiredPermission: 'content.internal-system' })

    const { colorMode, toggleColorMode } = useInternalSystemColorMode()

    const CRED_KEY = 'login_credentials'

    const form = reactive({ u: '', p: '' })
    const rememberMe = ref(false)
    const loading = ref(false)
    const errorMsg = ref('')

    // 頁面載入時讀取已儲存的帳密
    onMounted(() => {
        try {
            const raw = localStorage.getItem(CRED_KEY)
            if (raw) {
                const saved = JSON.parse(raw)
                form.u = saved.u ?? ''
                form.p = saved.p ?? ''
                rememberMe.value = true
            }
        } catch {}
    })

    const handleLogin = async () => {
        loading.value = true
        errorMsg.value = ''

        // 1. 呼叫登入 API（跟導頁分開 try/catch，才不會把「導頁失敗」誤標成「登入失敗」）
        let res: { rs: string; msg: string; url?: string }
        try {
            res = await $fetch<{ rs: string; msg: string; url?: string }>('/api/internal-system/auth/login', {
                method: 'POST',
                body: form,
            })
        } catch (e: any) {
            console.error('[internal-system login] API 呼叫失敗', e)
            errorMsg.value = e?.data?.message ?? e?.statusMessage ?? e?.message ?? '登入失敗，請稍後再試'
            loading.value = false
            return
        }

        if (res.rs !== '1') {
            errorMsg.value = res.msg ?? '帳號或密碼錯誤'
            loading.value = false
            return
        }

        // 2. 登入成功：依勾選決定是否儲存帳密
        if (rememberMe.value) {
            localStorage.setItem(CRED_KEY, JSON.stringify({ u: form.u, p: form.p }))
        } else {
            localStorage.removeItem(CRED_KEY)
        }

        // 3. 導頁到行事曆頁面（跟上面的 API 呼叫分開，導頁失敗會顯示不同訊息，方便判斷是哪一段出問題）
        try {
            await navigateTo('/staff/content/internal-system')
        } catch (e: any) {
            console.error('[internal-system login] 登入成功但導頁失敗', e)
            errorMsg.value = '登入成功，但導頁失敗：' + (e?.data?.message ?? e?.statusMessage ?? e?.message ?? '未知錯誤')
        } finally {
            loading.value = false
        }
    }
</script>

<style scoped>
    .login-wrapper {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        position: relative;
    }

    .theme-toggle {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.4);
        background: rgba(255,255,255,0.15);
        color: white;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .theme-toggle:hover { background: rgba(255,255,255,0.25); }

    .login-card {
        background: var(--surface);
        border-radius: 12px;
        padding: 40px;
        width: 360px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .login-header {
        text-align: center;
        margin-bottom: 30px;
    }

    .login-header h2 {
        font-size: 22px;
        color: var(--text);
        margin: 0 0 4px;
    }

    .login-header p {
        color: var(--text-hint);
        font-size: 14px;
        margin: 0;
    }

    .form-group {
        margin-bottom: 16px;
    }

    .form-group label {
        display: block;
        font-size: 13px;
        color: var(--text-muted);
        margin-bottom: 6px;
    }

    .form-group input[type="text"],
    .form-group input[type="password"] {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 15px;
        box-sizing: border-box;
        transition: border-color 0.2s;
        background: var(--surface);
        color: var(--text);
    }

    .form-group input:focus {
        outline: none;
        border-color: var(--accent);
    }

    .remember-row {
        margin-bottom: 12px;
    }

    .remember-label {
        display: flex !important;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--text-muted);
        cursor: pointer;
        margin-bottom: 0 !important;
    }

    .remember-label input[type="checkbox"] {
        width: 15px;
        height: 15px;
        cursor: pointer;
    }

    .error-msg {
        color: #e53e3e;
        font-size: 13px;
        margin-bottom: 12px;
        text-align: center;
    }

    .btn-login {
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
        transition: opacity 0.2s;
    }

    .btn-login:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .login-footer {
        margin-top: 24px;
        text-align: center;
    }

    .login-footer p {
        font-size: 12px;
        color: var(--text-hint);
        margin: 2px 0;
    }
</style>