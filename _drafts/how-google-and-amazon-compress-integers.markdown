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
image: /uploads/*.png

---

I have been blogging about integer compression for a while now, I hope you find this topic particularly interesting as I do. Anyway, it is definitely a research area, whose improvements are appealing even for big companies like Google and Amazon. 

This blog post will introduce a non-negative integer compression technique called **Varint** or **Variable byte** (or just VByte), which does not need to have a sorted input to work as it is for [Elias-Fano]({{ site.url }}{% post_url 2018-01-06-sorted-integers-compression-with-elias-fano-encoding %}).

One difference with many other compression algorithms is that VByte is a byte aligned codec. Bit-aligned codes can be inefficient to decode as they require several bitwise operations, so byte-aligned or word-aligned codes are usually preferred if speed is a main concern. Moreover, VByte - as you will see - is an extremely simple compression method, this obviously contribute to its popularity.
As you may have already imagined the biggest VByte drawback is its compression effectiveness, as small integers are still compressed with a minimum of 8 bits and bigger ones still need 16, 24 or 32 bits without intermediate values.



## Basic idea

There exist several variations of VByte, the most important ones will be introduced in the following paragraphs, but first I would like to pitch the  idea behind the simpler version.

A binary representation of a non-negative integer *x* is split into groups of of 7 bits which are represented as a sequence of bytes. The lower 7 bits of each byte store the data, whereas the eighth bit, called the continuation bit, indicates whether the current chunk is the last one or whether there are more to follow.

### Encoding and decoding in code

```cpp
void encodeVByte(std::vector<uint32_t> in, std::vector<uint8_t> out)
{

}
```

```cpp
void decodeVByte(std::vector<uint8_t> in, std::vector<uint32_t> out)
{

}
```


## Varint-GB

As pointed out by Jeff Dean during his keynote at WSDM in 2009, one of the biggest issue with Varint is that decoding requires lots of branches/shifts/masks. 
They replaced VByte with something called Varint-GB. The main idea behind it is to pack integers in blocks of four. In this way, the number of branches misprediction is drastically reduced. 

Google not only uses Varint-GB for search purposes (at least this was the case in 2009), but it is also part of the protocol buffer project. 
Proto buffers: https://developers.google.com/protocol-buffers/docs/encoding

## Varint-G8IU

Stepanov et al. [] present a variant of variable byte (called Varint-G8IU) which exploits SIMD operations of modern CPUs to further speed up decoding.

Amazon Patent: https://www.google.com/patents/US20120221539
http://www.amazontechon.com/locale/ro/pdfs/0_3_Integer%20encodings_new%20template.pdf
https://upscaledb.com/blog/0009-32bit-integer-compression-algorithms.html

## MaskedVByte and StreamVByte

More recently Daniel Lemire et al. come up with new ideas regarding vectorization of the VByte decoding process. 

## Benchmarks

### Gov2 dataset


|:--------- | -------------:|
| Documents &nbsp;&nbsp;| 24,622,347    |
| Terms     | 35,636,425    |
| Postings  | 5,742,630,292 |

### Space Usage


| Encoding    | Gov2     |
|:------------| --------:|
| Varint-GB   | 15.06 GB |
| Varint-G8IU | 14.06 GB |
| MaskedVByte | 12.38 GB |
| StreamVByte &nbsp;&nbsp;| 15.06 GB |

### OR queries

| Encoding    | Gov2    |
|:----------- | -------:|
| VarintGB    | 35.3 ms |
| Varint-G8IU | 34.7 ms |
| MaskedVByte &nbsp;&nbsp;| 38.9 ms |
| StreamVByte | 38.3 ms |


### Block-Max WAND (BMW)

| Encoding    | Gov2     |
|:----------- | --------:|
| VarintGB    | 1.558 ms |
| Varint-G8IU | 1.509 ms |
| MaskedVByte &nbsp;&nbsp;| 1.607 ms |
| StreamVByte | 1.855 ms |


## Conclusion
