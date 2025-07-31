export async function loginUser(username, password) {
  try {
    const res = await fetch('https://api.ibb.vn/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.log('❌ API error:', err);
    return { success: false, message: 'Không kết nối được đến server' };
  }
}
