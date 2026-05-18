# Admin Master

1. Crie uma conta no app ou no Supabase Auth com o email:

```sql
Filhosamuel679@gmail.com
```

2. Não coloque senha no código.
3. A senha deve ser definida manualmente no Supabase Auth.
4. Depois de criar o usuário, rode no SQL Editor:

```sql
update public.profiles
set role = 'super_admin',
    driver_status = 'none',
    is_blocked = false
where lower(email) = lower('Filhosamuel679@gmail.com');
```

5. Confirme:

```sql
select id, email, role from public.profiles
where lower(email) = lower('Filhosamuel679@gmail.com');
```
