---
title: Let's implement a Gaussian Naive Bayes classifier in Python
description: .
tags: 
    - machine-learning
    - naive-bayes-classifier
    - algorithms
layout: post
image: /uploads/ML.png
---

![machine-learning]({{ site.url }}/uploads/ML.jpg){:class="img-responsive center-block"}

I finally found some time to do some machine learning. It is something I have always wanted to start practicing, as it is pretty clear that it is the future of complex problem solving.
Indeed, for some tasks, we do not have an algorithm we can write and execute, so make it up from the data. 

> *Machine learning uses the theory of statistics in building mathematical models.* - Ethem Alpaydin

A typical example of problem ML tries to solve is classification. It can be expressed as the ability, give some input data, to label the sample with a given class.

To make things clearer, lets make an example. Imagine we perform analysis on samples of objects and we retrieve their specs. Now, given this information we would like to know if that object is a window glass (from vehicle or building) or not window glass (containers, tableware, or headlamps). Unfortunately, we do not have a formula where we can plug these values and get an answer to our question.

Someone who has handled glasses might tell just by looking or touching it if that is a windows glass or not. That is because he has acquired experience by looking at many examples of different kind of glasses. This is exactly what happens with machine learning. We say that we 'train' the algorithm to learn from known examples.

We provided a 'training set' where we specify both the input specs of the class and its category. The algorithm going through the examples learns how a window glass is typically made and so he can infer its class given an uncategorized example. 

For our example we will use a dataset titled 'Glass Identification Database', created by B. German from Central Research Establishment Home Office Forensic Science Service.
The original dataset classified the glass into 7 classes: 4 types of window
glass classes, and 3 types of non-window glass classes.  Our version
treats all 4 types of window glass classes as one class, and all 3 types of
non-window glass classes as one class.

#### Attribute and Class Information:

0. Example number
1. RI: refractive index
2. Na: Sodium (unit measurement: weight percent in corresponding oxide, as are attributes 4-10)
3. Mg: Magnesium
4. Al: Aluminum
5. Si: Silicon
6. K: Potassium
7. Ca: Calcium
8. Ba: Barium
9. Fe: Iron
10. Type of glass: (class)
  -- 1 window glass (from vehicle or building)
  -- 2 not window glass (containers, tableware, or headlamps)

The following is an extract of how the dataset looks like:

```json
1,1.51824,12.87,3.48,1.29,72.95,0.6,8.43,0,0,1
2,1.51832,13.33,3.34,1.54,72.14,0.56,8.99,0,0,1
3,1.51747,12.84,3.5,1.14,73.27,0.56,8.55,0,0,1
...
196,1.52315,13.44,3.34,1.23,72.38,0.6,8.83,0,0,2
197,1.51848,13.64,3.87,1.27,71.96,0.54,8.32,0,0.32,1
198,1.523,13.31,3.58,0.82,71.99,0.12,10.17,0,0.03,1
199,1.51905,13.6,3.62,1.11,72.64,0.14,8.76,0,0,1
200,1.52213,14.21,3.82,0.47,71.77,0.11,9.57,0,0,1
```


## Bayes’ Rule

$$P(C|x) = \frac{P(C) \cdot P(x|C)}{P(x)}$$

### Read data

```python
def split_data(data, blocks_num=1, test_block=0):
    blocks = numpy.array_split(data, blocks_num)
    test_set = blocks[test_block]
    if blocks_num > 1:
        del blocks[test_block]
    training_set = pandas.concat(blocks)
    return training_set, test_set
```

### Prior

```python
def __prior(self):
    counts = self.__training_set["Class"].value_counts().to_dict()
    self.__priors = {(k, v / self.__n) for k, v in counts.items()}
```

### Gaussian Probability Density Function 

```python
@staticmethod
def __calculate_probability(x, mean, variance):
    exponent = math.exp(-(math.pow(x - mean, 2) / (2 * variance)))
    return (1 / (math.sqrt(2 * math.pi * variance))) * exponent
```

### Predict

```python
def predict(self):
    predictions = {}
    for _, row in self.__test_set.iterrows():
        results = {}
        for k, v in self.__priors:
            p = 0
            for attr_name in ATTR_NAMES:
                prob = self.__calculate_probability(row[attr_name], self.__mean_variance[
                    k][attr_name][0], self.__mean_variance[k][attr_name][1])
                if prob > 0:
                    p += math.log(prob)
            results[k] = math.log(v) + p
        predictions[int(row["Num"])] = max([key for key in results.keys() if results[
            key] == results[max(results, key=results.get)]])
    return predictions
```

### Accuracy

```python
def calculate_accuracy(test_set, predictions):
    correct = 0
    for _, t in test_set.iterrows():
        if t["Class"] == predictions[t["Num"]]:
            correct += 1
    return (correct / len(test_set)) * 100.0
```

## References

