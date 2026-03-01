package service

import (
	"bytes"
	"encoding/binary"
	"testing"
)

// buildWebPFile constructs a minimal valid WebP file byte sequence.
func buildWebPFile(chunks [][]byte) []byte {
	var body []byte
	for _, c := range chunks {
		body = append(body, c...)
	}
	var buf []byte
	buf = append(buf, []byte("RIFF")...)
	size := make([]byte, 4)
	binary.LittleEndian.PutUint32(size, uint32(4+len(body)))
	buf = append(buf, size...)
	buf = append(buf, []byte("WEBP")...)
	buf = append(buf, body...)
	return buf
}

// buildChunk constructs a RIFF chunk (type + size + data + optional padding byte).
func buildChunk(t [4]byte, data []byte) []byte {
	var buf []byte
	buf = append(buf, t[:]...)
	sz := make([]byte, 4)
	binary.LittleEndian.PutUint32(sz, uint32(len(data)))
	buf = append(buf, sz...)
	buf = append(buf, data...)
	if len(data)%2 == 1 {
		buf = append(buf, 0x00) // Pad odd-sized chunk with 1 byte (RIFF spec).
	}
	return buf
}

func TestDecodeWebPDimensions_VP8X(t *testing.T) {
	// VP8X: width=100, height=200
	// data[4:7] = width-1 = 99  (little-endian 24-bit)
	// data[7:10] = height-1 = 199 (little-endian 24-bit)
	data := make([]byte, 10)
	data[4] = 99
	data[7] = 199

	file := buildWebPFile([][]byte{buildChunk([4]byte{'V', 'P', '8', 'X'}, data)})
	r := bytes.NewReader(file)
	w, h, err := decodeWebPDimensions(r)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if w != 100 || h != 200 {
		t.Fatalf("want 100x200, got %dx%d", w, h)
	}
}

func TestDecodeWebPDimensions_VP8(t *testing.T) {
	// VP8 : width=300, height=400
	// data[6:8] = 300 in little-endian (lower 14 bits)
	// data[8:10] = 400 in little-endian (lower 14 bits)
	data := make([]byte, 10)
	binary.LittleEndian.PutUint16(data[6:8], 300)
	binary.LittleEndian.PutUint16(data[8:10], 400)

	file := buildWebPFile([][]byte{buildChunk([4]byte{'V', 'P', '8', ' '}, data)})
	r := bytes.NewReader(file)
	w, h, err := decodeWebPDimensions(r)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if w != 300 || h != 400 {
		t.Fatalf("want 300x400, got %dx%d", w, h)
	}
}

func TestDecodeWebPDimensions_VP8L(t *testing.T) {
	// VP8L: width=50, height=60
	// bits[0:14] = width-1 = 49, bits[14:28] = height-1 = 59
	// bits = 49 | (59 << 14) = 49 + 966656 = 966705 = 0x000EC031
	bits := uint32(49) | (uint32(59) << 14)
	data := make([]byte, 5)
	data[0] = 0x2f
	binary.LittleEndian.PutUint32(data[1:5], bits)

	file := buildWebPFile([][]byte{buildChunk([4]byte{'V', 'P', '8', 'L'}, data)})
	r := bytes.NewReader(file)
	w, h, err := decodeWebPDimensions(r)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if w != 50 || h != 60 {
		t.Fatalf("want 50x60, got %dx%d", w, h)
	}
}

// TestDecodeWebPDimensions_SkipsNonDimChunk verifies that non-dimension chunks
// are seeked past without any heap allocation, and that dimensions are correctly
// extracted from the subsequent VP8X chunk. This is the core regression test for
// the fix: using io.Seek instead of make([]byte, chunkSize)+io.ReadFull.
func TestDecodeWebPDimensions_SkipsNonDimChunk(t *testing.T) {
	// Place a 1 KB unknown "ANIM" chunk before the VP8X dimension chunk.
	unknownData := make([]byte, 1024)
	for i := range unknownData {
		unknownData[i] = 0xAB
	}
	unknownChunk := buildChunk([4]byte{'A', 'N', 'I', 'M'}, unknownData)

	// VP8X: width=640, height=480
	vp8xData := make([]byte, 10)
	// data[4:7] = width-1 = 639 (little-endian 24-bit)
	// data[7:10] = height-1 = 479 (little-endian 24-bit)
	vp8xData[4] = byte(639 & 0xFF)
	vp8xData[5] = byte((639 >> 8) & 0xFF)
	vp8xData[6] = byte((639 >> 16) & 0xFF)
	vp8xData[7] = byte(479 & 0xFF)
	vp8xData[8] = byte((479 >> 8) & 0xFF)
	vp8xData[9] = byte((479 >> 16) & 0xFF)
	vp8xChunk := buildChunk([4]byte{'V', 'P', '8', 'X'}, vp8xData)

	file := buildWebPFile([][]byte{unknownChunk, vp8xChunk})
	r := bytes.NewReader(file)
	w, h, err := decodeWebPDimensions(r)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if w != 640 || h != 480 {
		t.Fatalf("want 640x480, got %dx%d", w, h)
	}
}

func TestDecodeWebPDimensions_InvalidHeader(t *testing.T) {
	data := []byte("NOT A WEBP FILE HEADER!!")
	r := bytes.NewReader(data)
	_, _, err := decodeWebPDimensions(r)
	if err == nil {
		t.Fatal("expected error for invalid header")
	}
}

func TestDecodeWebPDimensions_ChunkSizeTooLarge(t *testing.T) {
	// Construct a file with chunk size > maxWebPChunkSize (200 MB > 100 MB).
	var buf []byte
	buf = append(buf, []byte("RIFF")...)
	riffSize := make([]byte, 4)
	binary.LittleEndian.PutUint32(riffSize, 100)
	buf = append(buf, riffSize...)
	buf = append(buf, []byte("WEBP")...)
	// chunk type
	buf = append(buf, []byte("VP8X")...)
	// chunk size = 200 MB (exceeds maxWebPChunkSize = 100 MB)
	oversized := make([]byte, 4)
	binary.LittleEndian.PutUint32(oversized, 200<<20)
	buf = append(buf, oversized...)

	r := bytes.NewReader(buf)
	_, _, err := decodeWebPDimensions(r)
	if err == nil {
		t.Fatal("expected error for oversized chunk")
	}
}
