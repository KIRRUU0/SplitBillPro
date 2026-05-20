-- Mengaktifkan ekstensi UUID jika belum aktif
create extension if not exists "uuid-ossp";

-- Tabel Bills
create table bills (
    id uuid default gen_random_uuid() primary key,
    title varchar(255) not null,
    total_amount numeric(12, 2) not null default 0.00,
    total_tax numeric(12, 2) not null default 0.00,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabel Members
create table members (
    id uuid default gen_random_uuid() primary key,
    bill_id uuid references bills(id) on delete cascade not null,
    name varchar(255) not null,
    tax_share numeric(12, 2) not null default 0.00
);

-- Tabel Bill Items
create table bill_items (
    id uuid default gen_random_uuid() primary key,
    bill_id uuid references bills(id) on delete cascade not null,
    item_name varchar(255) not null,
    price numeric(12, 2) not null default 0.00,
    assigned_to_member_id uuid references members(id) on delete set null
);

-- Index untuk mempercepat query relasi
create index idx_members_bill_id on members(bill_id);
create index idx_bill_items_bill_id on bill_items(bill_id);
create index idx_bill_items_assigned_to on bill_items(assigned_to_member_id);
