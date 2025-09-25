const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.resolve(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function init() {
  await run('pragma foreign_keys = on');
  await run(`create table if not exists users (
    id integer primary key autoincrement,
    name text not null default '',
    email text not null unique,
    password_hash text not null,
    avatar_url text not null default '',
    bio text not null default '',
    description text not null default '',
    role text not null default 'user',
    created_at datetime not null default current_timestamp
  )`);
  await run(`create table if not exists favorites (
    id integer primary key autoincrement,
    user_id integer not null,
    path text not null,
    created_at datetime not null default current_timestamp,
    unique(user_id, path),
    foreign key(user_id) references users(id) on delete cascade
  )`);
  await run(`create table if not exists notes (
    user_id integer not null,
    path text not null,
    content text not null default '',
    updated_at datetime not null default current_timestamp,
    primary key(user_id, path),
    foreign key(user_id) references users(id) on delete cascade
  )`);
  await run(`create table if not exists history (
    id integer primary key autoincrement,
    user_id integer not null,
    path text not null,
    visited_at datetime not null default current_timestamp,
    foreign key(user_id) references users(id) on delete cascade
  )`);

  // Posts
  await run(`create table if not exists posts (
    id integer primary key autoincrement,
    slug text not null unique,
    title text not null,
    content text not null,
    published integer not null default 1,
    author_id integer not null,
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp,
    foreign key(author_id) references users(id) on delete cascade
  )`);

  // Seed admin user if missing
  const admin = await get('select id from users where email = ?', ['admin']);
  if (!admin) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('admin', 10);
    await run('insert into users(name,email,password_hash,role) values(?,?,?,?)', ['Administrator','admin',hash,'admin']);
  }
}

module.exports = { db, run, get, all, init };


