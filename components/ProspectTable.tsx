'use client';

import type { Prospect } from '@/lib/types';

const numberId = new Intl.NumberFormat('id-ID');

function waLink(prospect: Prospect): string {
  const text = `Halo ${prospect.name}, saya ingin menawarkan pembuatan website untuk usaha Anda. Apakah boleh saya kirimkan beberapa contoh?`;
  return `https://wa.me/${prospect.whatsapp}?text=${encodeURIComponent(text)}`;
}

export default function ProspectTable({
  results,
  loading,
  searched,
}: {
  results: Prospect[];
  loading: boolean;
  searched: boolean;
}) {
  if (loading && !results.length) {
    return (
      <div className="table-wrap">
        <table className="prospects">
          <thead>
            <tr>
              <th>Nama Usaha</th>
              <th>Kategori</th>
              <th>Telepon / WhatsApp</th>
              <th>Alamat</th>
              <th>Rating</th>
              <th>Google Maps</th>
              <th>Rekomendasi Fitur Web</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr className="skeleton-row" key={i}>
                {Array.from({ length: 7 }).map((__, j) => (
                  <td key={j}>
                    <div className="skeleton-bar" style={{ width: j === 6 ? '90%' : '70%' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!results.length) {
    return (
      <div className="empty-state">
        <div className="icon">{searched ? '∅' : '⌕'}</div>
        <h3>{searched ? 'Tidak ada prospek tanpa website di wilayah ini' : 'Belum ada pencarian'}</h3>
        <p>
          {searched
            ? 'Semua tempat yang ditemukan di kota ini sudah punya website. Coba ganti kota / provinsi atau pilih sub-kategori lain.'
            : 'Pilih kategori usaha, provinsi, dan kota, lalu tekan "Cari Prospek". Hasil yang sudah punya website akan otomatis dibuang.'}
        </p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="prospects">
        <thead>
          <tr>
            <th>Nama Usaha</th>
            <th>Kategori</th>
            <th>Telepon / WhatsApp</th>
            <th>Alamat</th>
            <th>Rating</th>
            <th>Google Maps</th>
            <th>Rekomendasi Fitur Web</th>
          </tr>
        </thead>
        <tbody>
          {results.map((p) => (
            <tr key={p.placeId}>
              <td data-label="Nama Usaha">
                <div className="biz-name">{p.name}</div>
                <div className="cell-sub">{p.sector}</div>
              </td>

              <td data-label="Kategori">
                <span className="chip">{p.subCategory}</span>
              </td>

              <td data-label="Telepon / WhatsApp">
                {p.whatsapp ? (
                  <>
                    <a
                      className="btn btn-sm btn-wa"
                      href={waLink(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                    <div className="cell-sub mono">{p.phoneDisplay}</div>
                  </>
                ) : (
                  <span className="wa-none">{p.phoneRaw ? p.phoneRaw : 'Nomor tidak tersedia'}</span>
                )}
              </td>

              <td data-label="Alamat">
                <div className="addr">{p.address}</div>
              </td>

              <td data-label="Rating">
                {typeof p.rating === 'number' ? (
                  <>
                    <span className="rating">
                      <span className="star">★</span>
                      {p.rating.toFixed(1)}
                    </span>
                    <div className="reviews">{numberId.format(p.reviews)} ulasan</div>
                  </>
                ) : (
                  <span className="wa-none">Belum ada rating</span>
                )}
              </td>

              <td data-label="Google Maps">
                <a
                  className="chip chip-neutral"
                  href={p.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Buka Maps
                </a>
              </td>

              <td data-label="Rekomendasi Fitur Web">
                <div className="pitch-cell">{p.pitch}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
