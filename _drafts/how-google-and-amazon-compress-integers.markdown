---
title: How Google and Amazon compress integers
description: This blog post will introduce a non-negative integer compression technique called Varint or Variable byte (or just VByte), which does not need to have a sorted input to work as it is for Elias-Fano.
tags: 
    - compression
    - data structures
    - VByte
    - Varint
    - Variable byte
layout: post
image: /uploads/integers-compression.jpg

---
![integers-compression]({{ site.url }}/uploads/integers-compression.jpg){:class="img-responsive"}

I have been blogging about integer compression for a while now, I hope you find this topic particularly interesting as I do. Anyway, it is definitely a research area, whose improvements are appealing even for big companies like Google and Amazon. 

This blog post will introduce a non-negative integer compression technique called **Varint** or **Variable byte** (or just VByte), which does not need to have a sorted input to work as it is for [Elias-Fano]({{ site.url }}{% post_url 2018-01-06-sorted-integers-compression-with-elias-fano-encoding %}).

One difference with many other compression algorithms is that VByte is a byte aligned codec. Bit-aligned codes can be inefficient to decode as they require several bitwise operations, so byte-aligned or word-aligned codes are usually preferred if speed is a main concern. Moreover, VByte - as you will see - is an extremely simple compression method, this obviously contribute to its popularity.
As you may have already imagined the biggest VByte drawback is its compression effectiveness, as small integers are still compressed with a minimum of 8 bits and bigger ones still need 16, 24 or 32 bits without intermediate values.



## Basic idea

There exist several variations of VByte, the most important ones will be introduced in the following paragraphs, but first I would like to pitch the  idea behind the simpler version.

A binary representation of a non-negative integer *x* is split into groups of of 7 bits which are represented as a sequence of bytes. The lower 7 bits of each byte store the data, whereas the eighth bit, called the continuation bit, indicates whether the current chunk is the last one or whether there are more to follow.

### Encoding and decoding in code

```cpp
size_t encodeVByte(uint64_t val, uint8_t* out) {
{
  uint8_t* p = out.data();
  while (val >= 128) {
    *p++ = 0x80 | (val & 0x7f);
    val >>= 7;
  }
  *p++ = uint8_t(val);
  return size_t(p - out.data());
}
```

```cpp
uint64_t decodeVByte(std::vector<uint8_t> in)
{
  int8_t* p = reinterpret_cast<int8_t*>(data.data());
  uint64_t val = 0;
  int64_t b = *p++;
  do {
    val = (b & 0x7f);        
    if (b >= 0) {
      break;
    }
    b = *p++;
    val |= (b & 0x7f) << 7;
    if (b >= 0) {
      break;
    }
    b = *p++;
    val |= (b & 0x7f) << 14;
    if (b >= 0) {
      break;
    }
    b = *p++;
    val |= (b & 0x7f) << 21;
    if (b >= 0) {
      break;
    }
    b = *p++;
    val |= (b & 0x7f) << 28;
    if (b >= 0) {
      break;
    }
    b = *p++;
    val |= (b & 0x7f) << 35;
    if (b >= 0) {
      break;
    }
    b = *p++;
    val |= (b & 0x7f) << 42;
    if (b >= 0) {
      break;
    }
    b = *p++;
    val |= (b & 0x7f) << 49;
    if (b >= 0) {
      break;
    }
    b = *p++;
    val |= (b & 0x7f) << 56;
    if (b >= 0) {
      break;
    }
    b = *p++;
    val |= (b & 0x01) << 63;
    if (b >= 0) {
      break;
    }
  } while(false); 

  return val;
}
```

## Varint-GB

As pointed out by Jeff Dean during his keynote at WSDM in 2009, one of the biggest issue with Varint is that decoding requires lots of branches/shifts/masks. 
They replaced VByte with something called Varint-GB. The main idea behind it is to pack integers in blocks of four. In this way, the number of branches misprediction is drastically reduced. 

Google not only uses Varint-GB for search purposes (at least this was the case in 2009), but it is also part of the protocol buffer project. 
Proto buffers: https://developers.google.com/protocol-buffers/docs/encoding

## Varint-G8IU

Stepanov et al. [^fnVarintG8IU] present a variant of variable byte (called Varint-G8IU) which exploits SIMD operations of modern CPUs to further speed up decoding.

This scheme was patented by Rose, Stepanov et al. ([US20120221539A1](https://patents.google.com/patent/US20120221539)) Amazon....

http://www.amazontechon.com/locale/ro/pdfs/0_3_Integer%20encodings_new%20template.pdf
https://upscaledb.com/blog/0009-32bit-integer-compression-algorithms.html

## MaskedVByte and StreamVByte

More recently Daniel Lemire et al. come up with new ideas regarding vectorization of the VByte decoding process [^fnMasked] [^fnStream]. 

## Benchmarks

All the benchmarks are implemented in C++11 and compiled with GCC 5.4.0 with the highest optimization settings.
The tests are performed on a machine with 8 Intel Core i7-4770K Haswell cores clocked at 3.50GHz, with 32GiB RAM, running Linux 4.4.0. 
The indexes are saved to disk after construction, and memory mapped to be queried, so that there are no hidden space costs due to loading of additional data structures in memory.

All my experiments are executed on an Intel Core i7-4770 CPU (Haswell) with 32 GB memory (DDR3-1600 with double-channel). The CPU has 4 cores of 3.40 GHz each, and 8 MB of L3 cache. Turbo Boost is disabled on the test machine, and the processor is set to run at its highest clock speed. The computer runs Linux Ubuntu 14.04. We report wall-clock time.

### Gov2 dataset
Experiments have been performed on Gov2 dataset.
Gov2 is the TREC 2004 Terabyte Track test collection, consisting of 25 million .gov sites crawled in early 2004; the documents are truncated to 256 kB.

For each document in the collection the body text was extracted using Apache Tika2, and the words lowercased and stemmed using the Porter2 stemmer; no stopwords were removed. The docIds were assigned according to the lexicographic
order of their URLs. The following table reports the basic
statistics for the collection.

|:--------- | -------------:|
| Documents &nbsp;&nbsp;| 24,622,347    |
| Terms     | 35,636,425    |
| Postings  | 5,742,630,292 |

### Space Usage

Quite surprisingly the encoding which uses less space is MaskedVByte. 

| Encoding                            | Space    |
|:------------------------------------|:-------- |
| Varint-GB                           | 15.06 GB |
| Varint-G8IU                         | 14.06 GB |
| MaskedVByte                         | 12.38 GB |
| StreamVByte &emsp;&emsp;&emsp;&emsp;| 15.06 GB |


### Sequential decoding


| Encoding                             | Time
|:------------------------------------ |:--------------------- | 
| VarintGB                             | 3.2 ns/posting (18 s) |
| Varint-G8IU                          | 2.9 ns/posting (16 s) |
| MaskedVByte                          | 3.2 ns/posting (18 s) |
| StreamVByte &emsp;&emsp;&emsp;&emsp; | 4.0 ns/posting (22 s) |



### OR queries

| Encoding                            | Time    |
|:----------------------------------- |:------- |
| VarintGB                            | 35.3 ms |
| Varint-G8IU                         | 34.7 ms |
| MaskedVByte &emsp;&emsp;&emsp;&emsp;| 38.9 ms |
| StreamVByte                         | 38.3 ms |


### Block-Max WAND (BMW)
Ding and Suel [^fnBmw]

| Encoding                            | Time     |
|:----------------------------------- |:-------- |
| VarintGB                            | 1.558 ms |
| Varint-G8IU                         | 1.509 ms |
| MaskedVByte &emsp;&emsp;&emsp;&emsp;| 1.607 ms |
| StreamVByte                         | 1.855 ms |


## Conclusion


## References

[^fnMasked]: Jeff Plaisance, Nathan Kurz, Daniel Lemire, Vectorized VByte Decoding, International Symposium on Web Algorithms 2015, 2015. http://arxiv.org/abs/1503.07387.

[^fnStream]: Daniel Lemire, Nathan Kurz, Christoph Rupp, Stream VByte: Faster Byte-Oriented Integer Compression, Information Processing Letters 130, 2018.

[^fnVarintG8IU]: Alexander A. Stepanov, Anil R. Gangolli, Daniel E. Rose, Ryan J. Ernst, and Paramjit S. Oberoi. 2011. SIMD-based decoding of posting lists. In Proceedings of the 20th ACM international conference on Information and knowledge management (CIKM 11).

[^fnBmw]: Shuai Ding and Torsten Suel. 2011. Faster top-k document retrieval using block-max indexes. In Proceedings of the 34th international ACM SIGIR conference on Research and development in Information Retrieval.

