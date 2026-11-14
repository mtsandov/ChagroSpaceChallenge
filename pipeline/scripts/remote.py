import earthaccess
import h5py

_fs = None


def open_h5(granule, block_mb=1):
    global _fs
    if _fs is None:
        earthaccess.login(strategy="netrc")
        _fs = earthaccess.get_fsspec_https_session()
    url = next(u for u in granule.data_links() if u.endswith((".h5", ".he5", ".nc")))
    f = _fs.open(url, block_size=block_mb * 2**20, cache_type="blockcache")
    return h5py.File(f, "r")
